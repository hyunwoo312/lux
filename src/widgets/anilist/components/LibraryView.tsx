import { useCallback, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ErrorState, StateMessage } from "@/components/StateMessage";
import { Button } from "@/components/ui/button";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { usePolledResource, patchPolledResource } from "@/widgets/core/usePolledResource";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { fetchList, saveListStatus, saveProgress } from "@/widgets/anilist/lib/api/list";
import { parseCachedCurrent } from "@/widgets/anilist/lib/api/cache";
import { anilistKeys } from "@/widgets/anilist/lib/cache-keys";
import { computeBehind, progressLabel, sortCurrentEntries } from "@/widgets/anilist/lib/current";
import { writeFailureMessage } from "@/widgets/anilist/lib/load-failure";
import {
  emptyListMessage,
  listStatusLabel,
  isInProgressStatus,
  matchesListFilter,
} from "@/widgets/anilist/lib/list-status";
import { AnilistSkeleton } from "@/widgets/anilist/components/AnilistSkeleton";
import { AnilistWriteNotice } from "@/widgets/anilist/components/AnilistWriteNotice";
import { LibraryControls } from "@/widgets/anilist/components/library/LibraryControls";
import { LibraryEntries } from "@/widgets/anilist/components/library/LibraryEntries";
import { LibraryRow } from "@/widgets/anilist/components/library/LibraryRow";
import { LibraryTile } from "@/widgets/anilist/components/library/LibraryTile";
import { resolveSort, showsInProgress } from "@/widgets/anilist/components/library/filters";
import { useAnilistSync } from "@/widgets/anilist/useAnilistSync";
import { useAnilist, useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import { ANILIST_REFRESH_MS } from "@/widgets/anilist/types";
import type { CurrentData, CurrentEntry, TitleLanguage } from "@/widgets/anilist/types";

function withProgress(entry: CurrentEntry, progress: number): CurrentEntry {
  return {
    ...entry,
    progress,
    behind: computeBehind(entry.kind, progress, entry.total, entry.nextEpisode?.episode ?? null),
  };
}

function behindSummary(entries: CurrentEntry[]): string | null {
  const behind = entries.filter((entry) => entry.behind != null && entry.behind > 0);
  if (behind.length === 0) return null;
  const hasAnime = behind.some((entry) => entry.kind === "anime");
  const hasManga = behind.some((entry) => entry.kind === "manga");
  const noun = hasAnime && hasManga ? "releases" : hasManga ? "chapters" : "episodes";
  return `${behind.length} ${behind.length === 1 ? "title" : "titles"} with new ${noun}`;
}

type LibraryViewProps = {
  enabled: boolean;
  userId: number;
  newTab: boolean;
};

export function LibraryView({ enabled, userId, newTab }: LibraryViewProps) {
  const lang = useAnilist((d) => d.titleLanguage);
  const listFilter = useAnilist((d) => d.listFilter);
  const viewMode = useAnilist((d) => d.viewMode);
  const instanceId = useWidgetInstanceId();
  const setActiveTab = useAnilistStore((s) => s.setActiveTab);
  const { state, isRefreshing, refresh, lastSyncedAt } = usePolledResource(
    (signal) => fetchList(userId, lang, signal),
    {
      enabled,
      intervalMs: ANILIST_REFRESH_MS,
      cacheKey: anilistKeys.library(userId, lang),
      isEmpty: (data) => data.entries.length === 0,
      persist: true,
      parsePersisted: parseCachedCurrent,
    },
  );
  useAnilistSync(refresh, isRefreshing, lastSyncedAt);
  const reduced = useReducedMotion();

  return (
    <div className="flex h-full flex-col gap-2 p-1">
      <LibraryControls />
      <div className="relative min-h-0 flex-1">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={listFilter}
            className="flex h-full min-h-0 flex-col"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: reduced ? 0 : DURATION.fast, ease: EASE_OUT }}
          >
            {state.status === "loading" ? (
              <AnilistSkeleton variant={viewMode} label="Loading your list…" />
            ) : state.status === "error" ? (
              <ErrorState error={state.error} service="AniList" subject="your list" />
            ) : state.status === "empty" ? (
              <StateMessage
                message={emptyListMessage("all")}
                action={
                  <Button variant="outline" onClick={() => setActiveTab(instanceId, "discover")}>
                    Browse Discover
                  </Button>
                }
              />
            ) : (
              <>
                <ListBody data={state.data} newTab={newTab} lang={lang} userId={userId} />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function ListBody({
  data,
  newTab,
  lang,
  userId,
}: {
  data: CurrentData;
  newTab: boolean;
  lang: TitleLanguage;
  userId: number;
}) {
  const filter = useAnilist((d) => d.mediaFilter);
  const sort = useAnilist((d) => d.currentSort);
  const listFilter = useAnilist((d) => d.listFilter);
  const viewMode = useAnilist((d) => d.viewMode);
  const [pending, setPending] = useState<Record<number, boolean>>({});
  const [writeError, setWriteError] = useState("");
  const [announcement, setAnnouncement] = useState("");

  const effectiveSort = resolveSort(sort, listFilter);
  const isInProgress = (entry: CurrentEntry) =>
    entry.status ? isInProgressStatus(entry.status) : showsInProgress(listFilter);

  const libraryKey = anilistKeys.library(userId, lang);
  const patchEntry = useCallback(
    (target: CurrentEntry, change: (entry: CurrentEntry) => CurrentEntry) => {
      patchPolledResource<CurrentData>(libraryKey, (current) => ({
        ...current,
        entries: current.entries.map((entry) =>
          entry.id === target.id && entry.kind === target.kind ? change(entry) : entry,
        ),
      }));
    },
    [libraryKey],
  );

  const promote = useCallback(
    (entry: CurrentEntry) => {
      setPending((prev) => ({ ...prev, [entry.id]: true }));
      setWriteError("");
      setAnnouncement("");
      saveListStatus(entry.id, "CURRENT")
        .then((status) => patchEntry(entry, (item) => ({ ...item, status })))
        .catch((error: unknown) =>
          setWriteError(
            writeFailureMessage(
              error,
              `Couldn’t move ${entry.title} to ${listStatusLabel("CURRENT", entry.kind)}. Try again.`,
            ),
          ),
        )
        .finally(() => setPending((prev) => ({ ...prev, [entry.id]: false })));
    },
    [patchEntry],
  );

  const changeProgress = useCallback(
    (entry: CurrentEntry, delta: number) => {
      const next = entry.progress + delta;
      if (next < 0) return;
      setPending((prev) => ({ ...prev, [entry.id]: true }));
      setWriteError("");
      setAnnouncement("");
      patchEntry(entry, (item) => withProgress(item, next));
      saveProgress(entry.id, next)
        .then((saved) => {
          patchEntry(entry, (item) => withProgress(item, saved));
          setAnnouncement(`${entry.title}: ${progressLabel(withProgress(entry, saved))}`);
        })
        .catch((error: unknown) => {
          patchEntry(entry, (item) => withProgress(item, entry.progress));
          setWriteError(
            writeFailureMessage(
              error,
              `Couldn’t save your progress for ${entry.title}. Try again.`,
            ),
          );
        })
        .finally(() => setPending((prev) => ({ ...prev, [entry.id]: false })));
    },
    [patchEntry],
  );

  const statusMatched = data.entries.filter((entry) => matchesListFilter(listFilter, entry.status));
  const entries = sortCurrentEntries(
    statusMatched.filter((entry) => filter === "both" || entry.kind === filter),
    effectiveSort,
  );
  const grouped = effectiveSort === "airing";
  const displayEntries = grouped ? entries.filter((entry) => entry.nextEpisode) : entries;
  const newReleases = behindSummary(displayEntries);

  if (displayEntries.length === 0) {
    const message = grouped
      ? "Nothing airing soon."
      : statusMatched.length === 0
        ? emptyListMessage(listFilter)
        : "Nothing here.";
    return <StateMessage message={message} />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {newReleases && (
        <p className="text-ink-3 text-micro flex shrink-0 items-center gap-1.5 px-2 pb-1.5">
          <span className="bg-primary size-1.5 shrink-0 rounded-full" aria-hidden />
          {newReleases}
        </p>
      )}
      <AnilistWriteNotice message={writeError} />
      <div role="log" aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <LibraryEntries
        key={`${listFilter}-${filter}-${effectiveSort}`}
        entries={displayEntries}
        grouped={grouped}
        viewMode={viewMode}
        renderEntry={(entry) => {
          const Item = viewMode === "list" ? LibraryRow : LibraryTile;
          return (
            <Item
              entry={entry}
              newTab={newTab}
              scoreFormat={data.scoreFormat}
              pending={pending[entry.id] ?? false}
              inProgress={isInProgress(entry)}
              onIncrement={() => changeProgress(entry, 1)}
              onDecrement={() => changeProgress(entry, -1)}
              onPromote={() => promote(entry)}
            />
          );
        }}
      />
    </div>
  );
}
