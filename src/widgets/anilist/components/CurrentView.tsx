import { useCallback, useMemo, useRef, useState } from "react";
import { Clock, Loader2, Minus, Plus, Star, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import { ConfigSegmented, ConfigSelect } from "@/components/config/WidgetConfig";
import { usePolledResource, invalidatePolledResource } from "@/widgets/core/usePolledResource";
import { fetchCurrent, parseCachedCurrent, saveProgress } from "@/widgets/anilist/lib/anilist-api";
import {
  computeBehind,
  formatAiringIn,
  progressLabel,
  sortCurrentEntries,
  sumWaiting,
} from "@/widgets/anilist/lib/current";
import { MediaCover } from "@/widgets/anilist/components/MediaCover";
import { AnilistPlaceholder } from "@/widgets/anilist/components/AnilistPlaceholder";
import { anilistKeys } from "@/widgets/anilist/lib/cache-keys";
import { useAnilistSync } from "@/widgets/anilist/useAnilistSync";
import { useAnilist, useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type {
  CurrentData,
  CurrentEntry,
  CurrentSort,
  MediaFilter,
  TitleLanguage,
  WaitingTotals,
} from "@/widgets/anilist/types";

const REFRESH_MS = 3 * 60 * 1000;
const DAY_SECONDS = 86_400;

const FILTER_OPTIONS: { value: MediaFilter; label: string }[] = [
  { value: "both", label: "All" },
  { value: "anime", label: "Anime" },
  { value: "manga", label: "Manga" },
];

const SORT_OPTIONS: { value: CurrentSort; label: string }[] = [
  { value: "waiting", label: "Most behind" },
  { value: "recent", label: "Recently updated" },
  { value: "score", label: "Highest score" },
];

type CurrentViewProps = {
  enabled: boolean;
  userId: number;
  newTab: boolean;
};

export function CurrentView({ enabled, userId, newTab }: CurrentViewProps) {
  const lang = useAnilist((d) => d.titleLanguage);
  const { state, isRefreshing, refresh, lastSyncedAt } = usePolledResource(
    (signal) => fetchCurrent(userId, lang, signal),
    {
      enabled,
      intervalMs: REFRESH_MS,
      cacheKey: anilistKeys.current(userId, lang),
      isEmpty: (data) => data.entries.length === 0,
      persist: true,
      parsePersisted: parseCachedCurrent,
    },
  );
  useAnilistSync(refresh, isRefreshing, lastSyncedAt);

  if (state.status === "loading")
    return <AnilistPlaceholder>Loading your list…</AnilistPlaceholder>;
  if (state.status === "error")
    return <AnilistPlaceholder>Couldn’t load your list.</AnilistPlaceholder>;
  if (state.status === "empty")
    return <AnilistPlaceholder>Nothing in progress.</AnilistPlaceholder>;

  return <CurrentList data={state.data} newTab={newTab} lang={lang} userId={userId} />;
}

function CurrentList({
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
  const instanceId = useWidgetInstanceId();
  const filter = useAnilist((d) => d.mediaFilter);
  const setFilter = useAnilistStore((s) => s.setMediaFilter);
  const sort = useAnilist((d) => d.currentSort);
  const setSort = useAnilistStore((s) => s.setCurrentSort);

  const [progressOverrides, setProgressOverrides] = useState<Record<number, number>>({});
  const overridesRef = useRef(progressOverrides);
  overridesRef.current = progressOverrides;
  const [pending, setPending] = useState<Record<number, boolean>>({});

  const changeProgress = useCallback(
    (entry: CurrentEntry, delta: number) => {
      const current = overridesRef.current[entry.id] ?? entry.progress;
      const next = current + delta;
      if (next < 0) return;
      setProgressOverrides((prev) => ({ ...prev, [entry.id]: next }));
      setPending((prev) => ({ ...prev, [entry.id]: true }));
      saveProgress(entry.id, next).then(
        (saved) => {
          setProgressOverrides((prev) => ({ ...prev, [entry.id]: saved }));
          setPending((prev) => ({ ...prev, [entry.id]: false }));
          invalidatePolledResource(anilistKeys.current(userId, lang));
        },
        () => {
          setProgressOverrides((prev) => ({ ...prev, [entry.id]: current }));
          setPending((prev) => ({ ...prev, [entry.id]: false }));
        },
      );
    },
    [lang, userId],
  );

  const entries = useMemo(() => {
    const effective = data.entries.map((entry) => {
      const override = progressOverrides[entry.id];
      if (override == null) return entry;
      return {
        ...entry,
        progress: override,
        behind: computeBehind(
          entry.kind,
          override,
          entry.total,
          entry.nextEpisode?.episode ?? null,
        ),
      };
    });
    const filtered = effective.filter((entry) => filter === "both" || entry.kind === filter);
    return sortCurrentEntries(filtered, sort);
  }, [data.entries, progressOverrides, filter, sort]);

  const waiting = useMemo(() => sumWaiting(entries), [entries]);

  return (
    <div className="flex h-full flex-col gap-2 p-1">
      <div className="flex min-w-0 items-center justify-between gap-2 px-1">
        <div className="shrink-0">
          <ConfigSegmented
            label="Current filter"
            value={filter}
            options={FILTER_OPTIONS}
            onChange={(value) => setFilter(instanceId, value)}
          />
        </div>
        <ConfigSelect
          label="Sort by"
          value={sort}
          options={SORT_OPTIONS}
          onChange={(value) => setSort(instanceId, value)}
          triggerClassName="w-auto"
        />
      </div>
      <WaitingSummary waiting={waiting} />
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {entries.length === 0 ? (
          <AnilistPlaceholder>Nothing here.</AnilistPlaceholder>
        ) : (
          entries.map((entry) => (
            <CurrentRow
              key={`${entry.kind}-${entry.id}`}
              entry={entry}
              newTab={newTab}
              pending={pending[entry.id] ?? false}
              onIncrement={() => changeProgress(entry, 1)}
              onDecrement={() => changeProgress(entry, -1)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function WaitingSummary({ waiting }: { waiting: WaitingTotals }) {
  const parts: string[] = [];
  if (waiting.episodes > 0)
    parts.push(`${waiting.episodes} ${waiting.episodes === 1 ? "episode" : "episodes"}`);
  if (waiting.chapters > 0)
    parts.push(`${waiting.chapters} ${waiting.chapters === 1 ? "chapter" : "chapters"}`);

  return (
    <div className="px-1">
      {parts.length > 0 ? (
        <span className="text-primary text-sm font-semibold">{parts.join(" · ")} waiting</span>
      ) : (
        <span className="text-muted-foreground text-xs">All caught up</span>
      )}
    </div>
  );
}

function CurrentRow({
  entry,
  newTab,
  pending,
  onIncrement,
  onDecrement,
}: {
  entry: CurrentEntry;
  newTab: boolean;
  pending: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const canIncrement = entry.total == null || entry.progress < entry.total;
  const canDecrement = entry.progress > 0;
  const stepperWidth =
    canIncrement && canDecrement
      ? "group-hover:w-12 group-focus-within:w-12"
      : "group-hover:w-6 group-focus-within:w-6";
  const unit = entry.kind === "anime" ? "episode" : "chapter";
  const updated = entry.updatedAt
    ? formatRelativeTime(new Date(entry.updatedAt * 1000).toISOString())
    : null;

  return (
    <div className="group hover:bg-foreground/5 flex items-center gap-2.5 rounded-md px-2 py-1.5">
      <a
        href={entry.siteUrl}
        target={newTab ? "_blank" : undefined}
        rel="noreferrer"
        className="flex min-w-0 flex-1 items-center gap-2.5"
      >
        <MediaCover
          src={entry.coverImage}
          title={entry.title}
          color={entry.coverColor}
          className="h-12 w-9"
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="text-foreground min-w-0 truncate text-xs font-medium">{entry.title}</p>
            {entry.behind != null && entry.behind > 0 && (
              <span
                className="
                  bg-primary text-primary-foreground text-2xs shrink-0 rounded-full px-1.5 py-0.5
                  font-semibold tabular-nums
                "
              >
                {entry.behind} behind
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-2xs flex items-center gap-1.5">
            <span className="tabular-nums">{progressLabel(entry)}</span>
            {entry.nextEpisode ? (
              <AiringBadge
                airingAt={entry.nextEpisode.airingAt}
                episode={entry.nextEpisode.episode}
              />
            ) : (
              updated && <span className="truncate">{updated}</span>
            )}
          </p>
        </div>
      </a>
      <div className="flex shrink-0 items-center gap-1.5">
        {pending ? (
          <span className="text-muted-foreground flex size-6 items-center justify-center">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          </span>
        ) : (
          (canDecrement || canIncrement) && (
            <div
              className={cn(
                `
                  flex w-0 items-center overflow-hidden opacity-0 transition-[width,opacity]
                  duration-200
                  group-hover:opacity-100
                  group-focus-within:opacity-100
                `,
                stepperWidth,
              )}
            >
              {canDecrement && (
                <StepButton icon={Minus} label={`Unmark last ${unit}`} onClick={onDecrement} />
              )}
              {canIncrement && (
                <StepButton icon={Plus} label={`Mark next ${unit}`} onClick={onIncrement} />
              )}
            </div>
          )
        )}
        {entry.score != null && (
          <span className="
            text-muted-foreground inline-flex items-center gap-0.5 text-2xs tabular-nums
          ">
            <Star className="size-2.5" aria-hidden />
            {entry.score}
          </span>
        )}
      </div>
    </div>
  );
}

function StepButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="
        text-muted-foreground
        hover:text-foreground
        flex size-6 shrink-0 items-center justify-center rounded-sm
      "
    >
      <Icon className="size-3.5" aria-hidden />
    </button>
  );
}

function AiringBadge({ airingAt, episode }: { airingAt: number; episode: number }) {
  const now = Date.now();
  const soon = airingAt - Math.floor(now / 1000) <= DAY_SECONDS;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5",
        soon ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Clock className="size-2.5" aria-hidden />
      Ep {episode} in {formatAiringIn(airingAt, now)}
    </span>
  );
}
