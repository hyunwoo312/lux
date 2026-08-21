import { Fragment, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bookmark,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleSlash2,
  Clock,
  Filter,
  Flame,
  History,
  Library,
  Loader2,
  Minus,
  PauseCircle,
  PlayCircle,
  Plus,
  Star,
  type LucideIcon,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TYPE } from "@/lib/type";
import { formatRelativeTime } from "@/lib/relative-time";
import { loadErrorMessage } from "@/lib/net";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ConfigSegmented } from "@/components/config/WidgetConfig";
import { EASE_OUT } from "@/lib/motion";
import { accentClass } from "@/widgets/core/accent";
import { usePolledResource, patchPolledResource } from "@/widgets/core/usePolledResource";
import {
  fetchList,
  parseCachedCurrent,
  saveListStatus,
  saveProgress,
} from "@/widgets/anilist/lib/anilist-api";
import {
  computeBehind,
  formatAiringIn,
  formatScore,
  groupByAiringDay,
  progressLabel,
  sortCurrentEntries,
} from "@/widgets/anilist/lib/current";
import {
  emptyListMessage,
  isInProgressStatus,
  listFilterLabel,
  matchesListFilter,
} from "@/widgets/anilist/lib/list-status";
import { MediaCover } from "@/widgets/anilist/components/MediaCover";
import { AnilistPlaceholder } from "@/widgets/anilist/components/AnilistPlaceholder";
import { anilistKeys } from "@/widgets/anilist/lib/cache-keys";
import { useAnilistSync } from "@/widgets/anilist/useAnilistSync";
import { useAnilist, useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { ANILIST_ACCENT, LIST_FILTERS } from "@/widgets/anilist/types";
import type {
  CurrentData,
  CurrentEntry,
  CurrentSort,
  ListFilter,
  MediaFilter,
  ScoreFormat,
  TitleLanguage,
} from "@/widgets/anilist/types";

const REFRESH_MS = 3 * 60 * 1000;
const DAY_SECONDS = 86_400;
const LIBRARY_PAGE_SIZE = 30;
const WRITE_ERROR = "Couldn’t update your list. Try again.";

const FILTER_OPTIONS: { value: MediaFilter; label: string }[] = [
  { value: "both", label: "All" },
  { value: "anime", label: "Anime" },
  { value: "manga", label: "Manga" },
];

const SORT_OPTIONS: { value: CurrentSort; label: string }[] = [
  { value: "score", label: "Highest score" },
  { value: "waiting", label: "Most behind" },
  { value: "recent", label: "Recently updated" },
  { value: "airing", label: "Airing soon" },
];

const LIST_FILTER_ICONS: Record<ListFilter, LucideIcon> = {
  all: Library,
  progress: PlayCircle,
  planned: Bookmark,
  completed: CheckCircle2,
  paused: PauseCircle,
  dropped: CircleSlash2,
};

const SORT_ICONS: Record<CurrentSort, LucideIcon> = {
  waiting: Flame,
  recent: History,
  score: Star,
  airing: CalendarClock,
};

function showsInProgress(listFilter: ListFilter): boolean {
  return listFilter === "progress" || listFilter === "all";
}

function availableSorts(listFilter: ListFilter) {
  return (
    showsInProgress(listFilter)
      ? SORT_OPTIONS
      : SORT_OPTIONS.filter((option) => option.value !== "waiting")
  ).map((option) => ({ ...option, icon: SORT_ICONS[option.value] }));
}

function resolveSort(sort: CurrentSort, listFilter: ListFilter): CurrentSort {
  return availableSorts(listFilter).some((option) => option.value === sort) ? sort : "score";
}

function withProgress(entry: CurrentEntry, progress: number): CurrentEntry {
  return {
    ...entry,
    progress,
    behind: computeBehind(entry.kind, progress, entry.total, entry.nextEpisode?.episode ?? null),
  };
}

type LibraryViewProps = {
  enabled: boolean;
  userId: number;
  newTab: boolean;
};

export function LibraryView({ enabled, userId, newTab }: LibraryViewProps) {
  const lang = useAnilist((d) => d.titleLanguage);
  const listFilter = useAnilist((d) => d.listFilter);
  const { state, isRefreshing, refresh, lastSyncedAt } = usePolledResource(
    (signal) => fetchList(userId, lang, signal),
    {
      enabled,
      intervalMs: REFRESH_MS,
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
            transition={{ duration: reduced ? 0 : 0.16, ease: EASE_OUT }}
          >
            {state.status === "loading" ? (
              <AnilistPlaceholder>Loading your list…</AnilistPlaceholder>
            ) : state.status === "error" ? (
              <AnilistPlaceholder>
                {loadErrorMessage(state.error, "Couldn’t load your list.")}
              </AnilistPlaceholder>
            ) : state.status === "empty" ? (
              <AnilistPlaceholder>{emptyListMessage("all")}</AnilistPlaceholder>
            ) : (
              <ListBody data={state.data} newTab={newTab} lang={lang} userId={userId} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function LibraryControls() {
  const instanceId = useWidgetInstanceId();
  const filter = useAnilist((d) => d.mediaFilter);
  const setFilter = useAnilistStore((s) => s.setMediaFilter);
  const sort = useAnilist((d) => d.currentSort);
  const setSort = useAnilistStore((s) => s.setCurrentSort);
  const listFilter = useAnilist((d) => d.listFilter);
  const setListFilter = useAnilistStore((s) => s.setListFilter);

  const sortOptions = useMemo(() => availableSorts(listFilter), [listFilter]);
  const effectiveSort = resolveSort(sort, listFilter);
  const statusOptions = useMemo(
    () =>
      LIST_FILTERS.map((value) => ({
        value,
        label: listFilterLabel(value, filter),
        icon: LIST_FILTER_ICONS[value],
      })),
    [filter],
  );

  return (
    <div className="flex min-w-0 items-center gap-1.5 px-1">
      <ConfigSegmented
        label="Media filter"
        value={filter}
        options={FILTER_OPTIONS}
        onChange={(value) => setFilter(instanceId, value)}
      />
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <FilterMenu
          value={listFilter}
          options={statusOptions}
          onChange={(value) => setListFilter(instanceId, value)}
          ariaLabel="Change status filter"
          tooltip={listFilterLabel(listFilter, filter)}
        />
        <FilterMenu
          value={effectiveSort}
          options={sortOptions}
          onChange={(value) => setSort(instanceId, value)}
          ariaLabel="Change sort order"
          tooltip={`Sorted by ${(SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "").toLowerCase()}`}
        />
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
  const [pending, setPending] = useState<Record<number, boolean>>({});
  const [writeError, setWriteError] = useState("");
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

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
      if (pendingRef.current[entry.id]) return;
      setPending((prev) => ({ ...prev, [entry.id]: true }));
      setWriteError("");
      saveListStatus(entry.id, "CURRENT")
        .then((status) => patchEntry(entry, (item) => ({ ...item, status })))
        .catch(() => setWriteError(WRITE_ERROR))
        .finally(() => setPending((prev) => ({ ...prev, [entry.id]: false })));
    },
    [patchEntry],
  );

  const changeProgress = useCallback(
    (entry: CurrentEntry, delta: number) => {
      const next = entry.progress + delta;
      if (next < 0 || pendingRef.current[entry.id]) return;
      setPending((prev) => ({ ...prev, [entry.id]: true }));
      setWriteError("");
      patchEntry(entry, (item) => withProgress(item, next));
      saveProgress(entry.id, next)
        .then((saved) => patchEntry(entry, (item) => withProgress(item, saved)))
        .catch(() => {
          patchEntry(entry, (item) => withProgress(item, entry.progress));
          setWriteError(WRITE_ERROR);
        })
        .finally(() => setPending((prev) => ({ ...prev, [entry.id]: false })));
    },
    [patchEntry],
  );

  const statusMatched = useMemo(
    () => data.entries.filter((entry) => matchesListFilter(listFilter, entry.status)),
    [data.entries, listFilter],
  );

  const entries = useMemo(
    () =>
      sortCurrentEntries(
        statusMatched.filter((entry) => filter === "both" || entry.kind === filter),
        effectiveSort,
      ),
    [statusMatched, filter, effectiveSort],
  );

  const grouped = effectiveSort === "airing";
  const displayEntries = useMemo(
    () => (grouped ? entries.filter((entry) => entry.nextEpisode) : entries),
    [entries, grouped],
  );

  if (displayEntries.length === 0) {
    const message = grouped
      ? "Nothing airing soon."
      : statusMatched.length === 0
        ? emptyListMessage(listFilter)
        : "Nothing here.";
    return <AnilistPlaceholder>{message}</AnilistPlaceholder>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {writeError && (
        <p role="status" className="text-ink-3 text-micro shrink-0 px-2 py-1 text-center">
          {writeError}
        </p>
      )}
      <LibraryRows
        key={`${listFilter}-${filter}-${effectiveSort}`}
        entries={displayEntries}
        grouped={grouped}
        renderRow={(entry) => (
          <CurrentRow
            entry={entry}
            newTab={newTab}
            scoreFormat={data.scoreFormat}
            pending={pending[entry.id] ?? false}
            inProgress={isInProgress(entry)}
            onIncrement={() => changeProgress(entry, 1)}
            onDecrement={() => changeProgress(entry, -1)}
            onPromote={() => promote(entry)}
          />
        )}
      />
    </div>
  );
}

function LibraryRows({
  entries,
  grouped,
  renderRow,
}: {
  entries: CurrentEntry[];
  grouped: boolean;
  renderRow: (entry: CurrentEntry) => ReactNode;
}) {
  const [visibleCount, setVisibleCount] = useState(LIBRARY_PAGE_SIZE);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => entries.slice(0, visibleCount), [entries, visibleCount]);
  const hasMore = visible.length < entries.length;
  const loadMore = useCallback(() => setVisibleCount((count) => count + LIBRARY_PAGE_SIZE), []);
  useInfiniteScroll(scrollRef, sentinelRef, hasMore, loadMore);

  const groups = useMemo(() => (grouped ? groupByAiringDay(visible) : []), [grouped, visible]);

  return (
    <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
      {grouped
        ? groups.map((group) => (
            <section key={group.key} className="flex flex-col gap-1">
              <h4 className="text-ink-4 text-micro px-1 pt-1 font-bold tracking-wider uppercase">
                {group.label}
              </h4>
              {group.entries.map((entry) => (
                <Fragment key={`${entry.kind}-${entry.id}`}>{renderRow(entry)}</Fragment>
              ))}
            </section>
          ))
        : visible.map((entry) => (
            <Fragment key={`${entry.kind}-${entry.id}`}>{renderRow(entry)}</Fragment>
          ))}
      {entries.length > LIBRARY_PAGE_SIZE && (
        <div ref={sentinelRef} className="text-ink-4 text-micro py-2 text-center">
          {hasMore ? `Showing ${visible.length} of ${entries.length}` : `${entries.length} titles`}
        </div>
      )}
    </div>
  );
}

function CurrentRow({
  entry,
  newTab,
  scoreFormat,
  pending,
  inProgress,
  onIncrement,
  onDecrement,
  onPromote,
}: {
  entry: CurrentEntry;
  newTab: boolean;
  scoreFormat: ScoreFormat;
  pending: boolean;
  inProgress: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  onPromote: () => void;
}) {
  const canIncrement = entry.total == null || entry.progress < entry.total;
  const canDecrement = entry.progress > 0;
  const scoreText = entry.score != null ? formatScore(entry.score, scoreFormat) : null;
  const showScoreIcon = scoreFormat !== "POINT_5" && scoreFormat !== "POINT_3";
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
            <p className="text-ink min-w-0 truncate text-caption font-medium">{entry.title}</p>
            {entry.behind != null && entry.behind > 0 && (
              <span
                className="
                  bg-primary text-primary-foreground text-micro shrink-0 rounded-full px-1.5 py-0.5
                  font-semibold tabular-nums
                "
              >
                {entry.behind} behind
              </span>
            )}
          </div>
          <p className="text-ink-3 text-micro flex items-center gap-1.5">
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
          <span className="text-ink-3 flex size-6 items-center justify-center">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          </span>
        ) : !inProgress ? (
          <StepButton
            icon={PlayCircle}
            label={`Start ${entry.title}`}
            onClick={onPromote}
            className="
              opacity-0 transition-opacity duration-200
              group-hover:opacity-100
              group-focus-within:opacity-100
            "
          />
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
        {scoreText != null && (
          <span className={cn(TYPE.rowMeta, "inline-flex items-center gap-0.5 tabular-nums")}>
            {showScoreIcon && <Star className="size-2.5" aria-hidden />}
            {scoreText}
          </span>
        )}
      </div>
    </div>
  );
}

type FilterOption<T extends string> = { value: T; label: string; icon: LucideIcon };

const FILTER_TRIGGER_CLASS = `
  text-ink-4
  hover:text-ink hover:bg-foreground/5
  focus-visible:text-ink focus-visible:bg-foreground/5
  data-[state=open]:text-ink data-[state=open]:bg-foreground/5
  grid size-7 shrink-0 place-items-center rounded-sm outline-none transition-colors
`;

function FilterMenu<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  tooltip,
}: {
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  tooltip: string;
}) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const active = options.find((option) => option.value === value) ?? options[0];
  const ActiveIcon = active?.icon ?? Filter;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip content={tooltip}>
        <PopoverTrigger aria-label={ariaLabel} className={FILTER_TRIGGER_CLASS}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={value}
              className="flex"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5, rotate: 20 }}
              transition={{ duration: reduced ? 0 : 0.18, ease: EASE_OUT }}
            >
              <ActiveIcon className="size-3.5" aria-hidden />
            </motion.span>
          </AnimatePresence>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent
        align="end"
        className={cn(accentClass(ANILIST_ACCENT), "w-auto min-w-40 p-1")}
      >
        <div className="flex flex-col">
          {options.map((option, index) => {
            const Icon = option.icon;
            const selected = option.value === value;
            return (
              <motion.button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                initial={reduced ? false : { opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: reduced ? 0 : 0.16,
                  delay: reduced ? 0 : index * 0.025,
                  ease: EASE_OUT,
                }}
                className={cn(
                  `
                    hover:bg-accent
                    flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-caption
                    transition-colors
                  `,
                  selected ? "text-primary font-medium" : "text-ink",
                )}
              >
                <Icon className="size-3.5 shrink-0 opacity-70" aria-hidden />
                <span className="flex-1">{option.label}</span>
                <Check
                  className={cn(
                    "text-primary size-3 shrink-0 transition-opacity",
                    selected ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden
                />
              </motion.button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function StepButton({
  icon: Icon,
  className,
  label,
  onClick,
}: {
  icon: LucideIcon;
  className?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        `text-ink-3 hover:text-ink flex size-6 shrink-0 items-center justify-center rounded-sm`,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
    </button>
  );
}

function AiringBadge({ airingAt, episode }: { airingAt: number; episode: number }) {
  const now = Date.now();
  const soon = airingAt - Math.floor(now / 1000) <= DAY_SECONDS;
  return (
    <span className={cn("inline-flex items-center gap-0.5", soon ? "text-primary" : "text-ink-3")}>
      <Clock className="size-2.5" aria-hidden />
      Ep {episode} in {formatAiringIn(airingAt, now)}
    </span>
  );
}
