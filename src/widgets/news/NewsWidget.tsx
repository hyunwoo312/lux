import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { panelVariants } from "@/lib/motion";
import { normalizeTitle } from "@/widgets/news/lib/news";
import { GoogleSearch } from "@/widgets/news/components/GoogleSearch";
import { SearchField } from "@/components/SearchField";
import { NewsContent } from "@/widgets/news/components/NewsContent";
import { NewsSourceBar } from "@/widgets/news/components/NewsSourceBar";
import { TrendingContent } from "@/widgets/news/components/TrendingContent";
import { TrendingRegion } from "@/widgets/news/components/TrendingRegion";
import { SavedList, SavedToggle } from "@/widgets/news/components/SavedList";
import { useNewsResource } from "@/widgets/news/hooks/useNewsResource";
import { useNews, useNewsStore } from "@/widgets/news/useNewsStore";
import { useNow } from "@/hooks/useNow";
import { usePersistHydrated } from "@/hooks/usePersistHydrated";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { MAX_BOOKMARKS, type NewsItem } from "@/widgets/news/types";

export function NewsWidget() {
  const instanceId = useWidgetInstanceId();
  const reduced = useReducedMotion() ?? false;
  const view = useNews((d) => d.view);
  const { state, refresh, isRefreshing, tab, query, missingSources, withThumbnail } =
    useNewsResource(view === "news");
  const openBehavior = useNews((d) => d.openBehavior);
  const googleQuery = useNews((d) => d.googleQuery);
  const sortByLatest = useNews((d) => d.sortByLatest);
  const layout = useNews((d) => d.layout);
  const loadImages = useNews((d) => d.loadImages);
  const readTitles = useNews((d) => d.readTitles);
  const mutedTerms = useNews((d) => d.mutedTerms);
  const highlightTerms = useNews((d) => d.highlightTerms);
  const markRead = useNewsStore((s) => s.markRead);
  const markSeen = useNewsStore((s) => s.markSeen);

  const hydrated = usePersistHydrated(useNewsStore);

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
  const [showSaved, setShowSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const bookmarks = useNews((d) => d.bookmarks);
  const toggleBookmark = useNewsStore((s) => s.toggleBookmark);
  const savedLinks = useMemo(() => new Set(bookmarks.map((entry) => entry.item.link)), [bookmarks]);
  const onToggleSaved = (item: NewsItem) => {
    if (toggleBookmark(instanceId, item)) {
      setSaveError(null);
      return;
    }
    setSaveError(`Saved list is full — ${MAX_BOOKMARKS} items max.`);
  };

  const readSet = useMemo(() => new Set(readTitles), [readTitles]);
  const newTitles = useMemo(() => {
    if (!items || !seenSnapshot || seenSnapshot.size === 0) return new Set<string>();
    return new Set(
      items.map((entry) => normalizeTitle(entry.title)).filter((title) => !seenSnapshot.has(title)),
    );
  }, [items, seenSnapshot]);

  const now = useNow().getTime();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={view}
        variants={panelVariants(reduced)}
        initial="hidden"
        animate="show"
        exit="exit"
        className="flex h-full flex-col gap-2 pt-1"
      >
        {view === "trending" ? (
          <>
            <div className="shrink-0">
              <TrendingRegion />
            </div>
            <div className="min-h-0 flex-1">
              <TrendingContent layout={layout} />
            </div>
          </>
        ) : (
          <>
            <div className="flex shrink-0 items-center gap-1.5">
              <div className="min-w-0 flex-1">
                {tab === "google" ? (
                  <GoogleSearch query={googleQuery} />
                ) : (
                  <SearchField
                    value={allFilter}
                    onChange={setAllFilter}
                    label="Filter headlines and sources"
                    placeholder="Filter headlines and sources…"
                    className="shrink-0"
                  />
                )}
              </div>
              <SavedToggle
                count={bookmarks.length}
                active={showSaved}
                onToggle={() => setShowSaved((value) => !value)}
              />
            </div>
            <NewsSourceBar />
            {saveError && (
              <p role="status" className="text-ink-3 shrink-0 px-2 text-caption">
                {saveError}
              </p>
            )}
            <div className="min-h-0 flex-1">
              {showSaved ? (
                <SavedList
                  bookmarks={bookmarks}
                  filterQuery={tab === "google" ? "" : allFilter.trim()}
                  now={now}
                  openBehavior={openBehavior}
                  highlightTerms={highlightTerms}
                  onToggleSaved={onToggleSaved}
                />
              ) : (
                <NewsContent
                  state={state}
                  refresh={refresh}
                  isRefreshing={isRefreshing}
                  openBehavior={openBehavior}
                  withThumbnail={withThumbnail && loadImages}
                  withSource={tab === "all"}
                  layout={loadImages && withThumbnail ? layout : "list"}
                  sortByLatest={sortByLatest}
                  searchQuery={query || undefined}
                  filterQuery={tab === "google" ? "" : allFilter.trim()}
                  now={now}
                  missingSources={missingSources}
                  readTitles={readSet}
                  newTitles={newTitles}
                  mutedTerms={mutedTerms}
                  highlightTerms={highlightTerms}
                  onRead={(title) => markRead(instanceId, title)}
                  savedLinks={savedLinks}
                  onToggleSaved={onToggleSaved}
                />
              )}
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
