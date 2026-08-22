import { useRef, type ReactNode } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

type FeedListProps<T> = {
  label: string;
  items: T[];
  getKey: (item: T) => string | number;
  renderItem: (item: T, index: number) => ReactNode;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
};

export function FeedList<T>({
  label,
  items,
  getKey,
  renderItem,
  hasMore,
  isLoadingMore,
  loadMore,
}: FeedListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  useInfiniteScroll(scrollRef, sentinelRef, hasMore, loadMore);

  return (
    <div
      ref={scrollRef}
      className="flex h-full min-h-0 flex-col gap-1 scroll-fade overflow-y-auto px-1.5"
    >
      <ul aria-label={label} className="flex flex-col gap-1">
        {items.map((item, index) => (
          <li key={getKey(item)}>{renderItem(item, index)}</li>
        ))}
      </ul>
      {hasMore && (
        <div ref={sentinelRef} className="text-ink-3 text-micro py-2 text-center">
          {isLoadingMore ? "Loading more…" : ""}
        </div>
      )}
    </div>
  );
}
