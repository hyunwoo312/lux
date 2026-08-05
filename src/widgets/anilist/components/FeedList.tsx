import { Fragment, useRef, type ReactNode } from "react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

type FeedListProps<T> = {
  items: T[];
  getKey: (item: T) => string | number;
  renderItem: (item: T, index: number) => ReactNode;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
  header?: ReactNode;
};

export function FeedList<T>({
  items,
  getKey,
  renderItem,
  hasMore,
  isLoadingMore,
  loadMore,
  header,
}: FeedListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  useInfiniteScroll(scrollRef, sentinelRef, hasMore, loadMore);

  return (
    <div className="flex h-full flex-col gap-2 p-1">
      {header}
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {items.map((item, index) => (
          <Fragment key={getKey(item)}>{renderItem(item, index)}</Fragment>
        ))}
        {hasMore && (
          <div ref={sentinelRef} className="text-muted-foreground text-2xs py-2 text-center">
            {isLoadingMore ? "Loading more…" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
