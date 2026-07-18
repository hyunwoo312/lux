import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/relative-time";
import type { PolledResourceState } from "@/widgets/core/usePolledResource";
import { hasThumbnails, normalizeTitle } from "@/widgets/news/lib/news";
import { HeadlineRow } from "@/widgets/news/components/HeadlineRow";
import { HeadlineTile } from "@/widgets/news/components/HeadlineTile";
import { useNewsResource } from "@/widgets/news/hooks/useNewsResource";
import { useNews, useNewsStore } from "@/widgets/news/useNewsStore";
import { useNow } from "@/hooks/useNow";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type { NewsItem, NewsLayout } from "@/widgets/news/types";
import type { OpenBehavior } from "@/lib/open-url";

export function NewsWidget() {
  const instanceId = useWidgetInstanceId();
  const { state, refresh, isRefreshing, tab, query, isStale, lastSyncedAt } = useNewsResource();
  const openBehavior = useNews((d) => d.openBehavior);
  const googleQuery = useNews((d) => d.googleQuery);
  const sortByLatest = useNews((d) => d.sortByLatest);
  const enabledSources = useNews((d) => d.enabledSources);
  const layout = useNews((d) => d.layout);
  const readTitles = useNews((d) => d.readTitles);
  const mutedTerms = useNews((d) => d.mutedTerms);
  const highlightTerms = useNews((d) => d.highlightTerms);
  const markRead = useNewsStore((s) => s.markRead);
  const markSeen = useNewsStore((s) => s.markSeen);

  const [hydrated, setHydrated] = useState(() => useNewsStore.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return;
    return useNewsStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  const [seenSnapshot, setSeenSnapshot] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    const seen = useNewsStore.getState().byInstance[instanceId]?.seenTitles ?? [];
    setSeenSnapshot(new Set(seen));
  }, [hydrated, instanceId, tab]);

  const items = state.status === "success" ? state.data : null;
  useEffect(() => {
    if (!hydrated || !items) return;
    const markVisible = () => {
      if (document.visibilityState !== "visible") return;
      markSeen(
        instanceId,
        items.map((entry) => normalizeTitle(entry.title)),
      );
    };
    markVisible();
    document.addEventListener("visibilitychange", markVisible);
    return () => document.removeEventListener("visibilitychange", markVisible);
  }, [hydrated, items, instanceId, markSeen]);

  const [allFilter, setAllFilter] = useState("");

  const readSet = useMemo(() => new Set(readTitles), [readTitles]);
  const newTitles = useMemo(() => {
    if (!items || !seenSnapshot || seenSnapshot.size === 0) return new Set<string>();
    return new Set(
      items.map((entry) => normalizeTitle(entry.title)).filter((title) => !seenSnapshot.has(title)),
    );
  }, [items, seenSnapshot]);

  const withThumbnail = tab === "all" ? enabledSources.some(hasThumbnails) : hasThumbnails(tab);
  const now = useNow().getTime();

  return (
    <div className="flex h-full flex-col gap-2">
      {tab === "google" ? (
        <GoogleSearch query={googleQuery} />
      ) : (
        <HeadlineFilter value={allFilter} onChange={setAllFilter} />
      )}
      <div className="min-h-0 flex-1">
        <NewsContent
          state={state}
          refresh={refresh}
          isRefreshing={isRefreshing}
          openBehavior={openBehavior}
          withThumbnail={withThumbnail}
          withSource={tab === "all"}
          layout={layout}
          sortByLatest={sortByLatest}
          searchQuery={query || undefined}
          filterQuery={tab === "google" ? "" : allFilter.trim()}
          now={now}
          isStale={isStale}
          lastSyncedAt={lastSyncedAt}
          readTitles={readSet}
          newTitles={newTitles}
          mutedTerms={mutedTerms}
          highlightTerms={highlightTerms}
          onRead={(title) => markRead(instanceId, title)}
        />
      </div>
    </div>
  );
}

type NewsContentProps = {
  state: PolledResourceState<NewsItem[]>;
  refresh: () => void;
  isRefreshing: boolean;
  openBehavior: OpenBehavior;
  withThumbnail: boolean;
  withSource: boolean;
  layout: NewsLayout;
  sortByLatest: boolean;
  searchQuery: string | undefined;
  filterQuery: string;
  now: number;
  isStale: boolean;
  lastSyncedAt: number;
  readTitles: Set<string>;
  newTitles: Set<string>;
  mutedTerms: string[];
  highlightTerms: string[];
  onRead: (title: string) => void;
};

const TILE_GRID_CLASS = "grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-1.5";

function NewsContent({
  state,
  refresh,
  isRefreshing,
  openBehavior,
  withThumbnail,
  withSource,
  layout,
  sortByLatest,
  searchQuery,
  filterQuery,
  now,
  isStale,
  lastSyncedAt,
  readTitles,
  newTitles,
  mutedTerms,
  highlightTerms,
  onRead,
}: NewsContentProps) {
  if (state.status === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-2 text-center">
        <p className="text-muted-foreground text-sm">Couldn’t load the news.</p>
        <Button size="sm" variant="outline" onClick={refresh} disabled={isRefreshing}>
          {isRefreshing ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Retrying…
            </>
          ) : (
            "Retry"
          )}
        </Button>
      </div>
    );
  }

  if (state.status === "loading") {
    if (layout === "tiles") {
      return (
        <div className={`${TILE_GRID_CLASS} p-0.5`}>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="aspect-[2/1] w-full rounded-lg" />
          ))}
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-2 p-2">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex items-start gap-2.5">
            {withThumbnail && <Skeleton className="size-11 shrink-0 rounded-md" />}
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div
        className="
          text-muted-foreground flex h-full items-center justify-center px-4 text-center text-sm
        "
      >
        {searchQuery ? `No results for “${searchQuery}”` : "No headlines right now."}
      </div>
    );
  }

  const lowerTerms = mutedTerms.map((term) => term.toLowerCase());
  const visible =
    lowerTerms.length > 0
      ? state.data.filter(
          (entry) => !lowerTerms.some((term) => entry.title.toLowerCase().includes(term)),
        )
      : state.data;

  if (visible.length === 0) {
    return (
      <div
        className="
          text-muted-foreground flex h-full items-center justify-center px-4 text-center text-sm
        "
      >
        All current headlines match your muted keywords.
      </div>
    );
  }

  const lowerFilter = filterQuery.toLowerCase();
  const matched = lowerFilter
    ? visible.filter(
        (entry) =>
          entry.title.toLowerCase().includes(lowerFilter) ||
          entry.source.toLowerCase().includes(lowerFilter),
      )
    : visible;

  if (matched.length === 0) {
    return (
      <div
        className="
          text-muted-foreground flex h-full items-center justify-center px-4 text-center text-sm
        "
      >
        {`No matches for “${filterQuery}”`}
      </div>
    );
  }

  const sorted = sortByLatest
    ? [...matched].sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0))
    : matched;
  const items = sorted.map((item) => ({ item, titleKey: normalizeTitle(item.title) }));
  const isNew = (titleKey: string) => newTitles.has(titleKey) && !readTitles.has(titleKey);
  const newCount = items.reduce((count, entry) => count + (isNew(entry.titleKey) ? 1 : 0), 0);

  const list =
    layout === "tiles" ? (
      <ul className={`${TILE_GRID_CLASS} min-h-0 flex-1 content-start overflow-y-auto p-0.5`}>
        {items.map(({ item, titleKey }) => (
          <li key={item.id} className="min-w-0">
            <HeadlineTile
              item={item}
              now={now}
              openBehavior={openBehavior}
              withSource={withSource}
              isRead={readTitles.has(titleKey)}
              isNew={isNew(titleKey)}
              highlightTerms={highlightTerms}
              onRead={() => onRead(titleKey)}
            />
          </li>
        ))}
      </ul>
    ) : (
      <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
        {items.map(({ item, titleKey }) => (
          <li key={item.id}>
            <HeadlineRow
              item={item}
              now={now}
              openBehavior={openBehavior}
              withThumbnail={withThumbnail}
              withSource={withSource}
              isRead={readTitles.has(titleKey)}
              isNew={isNew(titleKey)}
              highlightTerms={highlightTerms}
              onRead={() => onRead(titleKey)}
            />
          </li>
        ))}
      </ul>
    );

  return (
    <div className="flex h-full flex-col">
      {isStale && (
        <div className="text-muted-foreground flex items-center gap-1.5 px-2 pb-1.5 text-xs">
          <WifiOff className="size-3 shrink-0" aria-hidden />
          Offline · updated {formatRelativeTime(lastSyncedAt, now)}
        </div>
      )}
      {newCount > 0 && (
        <div className="text-muted-foreground flex items-center gap-1.5 px-2 pb-1.5 text-xs">
          <span className="bg-primary size-1.5 rounded-full" aria-hidden />
          {newCount} new since your last visit
        </div>
      )}
      {list}
    </div>
  );
}

function HeadlineFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative shrink-0">
      <Search
        className="
          text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4
          -translate-y-1/2
        "
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Filter headlines and sources…"
        aria-label="Filter headlines and sources"
        className="[&::-webkit-search-cancel-button]:hidden px-8"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear filter"
          className="
            text-muted-foreground
            hover:text-foreground
            focus-visible:ring-ring/40
            absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center
            rounded-md outline-none
            focus-visible:ring-2
          "
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

function GoogleSearch({ query }: { query: string }) {
  const instanceId = useWidgetInstanceId();
  const setGoogleQuery = useNewsStore((s) => s.setGoogleQuery);
  const [value, setValue] = useState(query);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setGoogleQuery(instanceId, value.trim());
  };

  const clear = () => {
    setValue("");
    setGoogleQuery(instanceId, "");
  };

  return (
    <form onSubmit={submit} className="relative shrink-0">
      <Search
        className="
          text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4
          -translate-y-1/2
        "
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search Google News…"
        aria-label="Search Google News"
        className="[&::-webkit-search-cancel-button]:hidden px-8"
      />
      {query && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="
            text-muted-foreground
            hover:text-foreground
            focus-visible:ring-ring/40
            absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center
            rounded-md outline-none
            focus-visible:ring-2
          "
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </form>
  );
}
