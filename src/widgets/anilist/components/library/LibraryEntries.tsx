import { Fragment, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { cn } from "@/lib/utils";
import { COVER_GRID } from "@/widgets/anilist/components/coverGrid";
import { groupByAiringDay } from "@/widgets/anilist/lib/current";
import { LIBRARY_PAGE_SIZE } from "@/widgets/anilist/types";
import type { CurrentEntry, ViewMode } from "@/widgets/anilist/types";

export function LibraryEntries({
  entries,
  grouped,
  viewMode,
  renderEntry,
}: {
  entries: CurrentEntry[];
  grouped: boolean;
  viewMode: ViewMode;
  renderEntry: (entry: CurrentEntry) => ReactNode;
}) {
  const [visibleCount, setVisibleCount] = useState(LIBRARY_PAGE_SIZE);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => entries.slice(0, visibleCount), [entries, visibleCount]);
  const hasMore = visible.length < entries.length;
  const loadMore = useCallback(() => setVisibleCount((count) => count + LIBRARY_PAGE_SIZE), []);
  useInfiniteScroll(scrollRef, sentinelRef, hasMore, loadMore);

  const groups = useMemo(() => (grouped ? groupByAiringDay(visible) : []), [grouped, visible]);
  const isGrid = viewMode === "grid";
  const listClass = isGrid ? COVER_GRID : "flex flex-col gap-0.5";

  return (
    <div
      ref={scrollRef}
      className={cn(
        "flex min-h-0 flex-1 flex-col scroll-fade overflow-y-auto py-1",
        isGrid ? "gap-2 px-1.5" : "gap-1 px-1.5",
      )}
    >
      {grouped ? (
        groups.map((group) => (
          <section key={group.key} className={cn("flex flex-col", isGrid ? "gap-1.5" : "gap-1")}>
            <h4 className="text-ink-4 text-micro px-1 font-bold tracking-wider uppercase">
              {group.label}
            </h4>
            <ul aria-label={`Airing ${group.label}`} className={listClass}>
              {group.entries.map((entry) => (
                <Fragment key={`${entry.kind}-${entry.id}`}>{renderEntry(entry)}</Fragment>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <ul aria-label="Your library" className={listClass}>
          {visible.map((entry) => (
            <Fragment key={`${entry.kind}-${entry.id}`}>{renderEntry(entry)}</Fragment>
          ))}
        </ul>
      )}
      {entries.length > LIBRARY_PAGE_SIZE && (
        <div ref={sentinelRef} className="text-ink-4 text-micro py-2 text-center">
          {hasMore ? `Showing ${visible.length} of ${entries.length}` : `${entries.length} titles`}
        </div>
      )}
    </div>
  );
}
