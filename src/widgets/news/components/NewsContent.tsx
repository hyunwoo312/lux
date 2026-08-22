import type { ReactNode } from "react";
import { CloudOff, Star, WifiOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RetryButton, StateMessage } from "@/components/StateMessage";
import { formatRelativeTime } from "@/lib/relative-time";
import type { PolledResourceState } from "@/widgets/core/usePolledResource";
import { HeadlineRow } from "@/widgets/news/components/HeadlineRow";
import { HeadlineTile } from "@/widgets/news/components/HeadlineTile";
import { sourceTab } from "@/widgets/news/lib/news";
import { selectHeadlines } from "@/widgets/news/lib/select-headlines";
import type { OpenBehavior } from "@/lib/open-url";
import type { NewsItem, NewsLayout, NewsSource } from "@/widgets/news/types";

const TILE_GRID_CLASS = "grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-1.5";

function NewsMessage({ children }: { children: ReactNode }) {
  return (
    <div className="text-ink-3 flex h-full items-center justify-center px-4 text-center text-body">
      {children}
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
  missingSources: NewsSource[];
  readTitles: Set<string>;
  newTitles: Set<string>;
  mutedTerms: string[];
  highlightTerms: string[];
  onRead: (title: string) => void;
  savedLinks: Set<string>;
  onToggleSaved: (item: NewsItem) => void;
};

export function NewsContent({
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
  missingSources,
  readTitles,
  newTitles,
  mutedTerms,
  highlightTerms,
  onRead,
  savedLinks,
  onToggleSaved,
}: NewsContentProps) {
  if (state.status === "error") {
    return (
      <StateMessage
        message="Couldn’t load the news."
        action={<RetryButton onRetry={refresh} retrying={isRefreshing} />}
      />
    );
  }

  if (state.status === "loading") {
    if (layout === "tiles") {
      return (
        <div className={`${TILE_GRID_CLASS} p-0.5`}>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="aspect-[16/9] w-full rounded-lg" />
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
      <NewsMessage>
        {searchQuery ? `No results for “${searchQuery}”` : "No headlines right now."}
      </NewsMessage>
    );
  }

  const selection = selectHeadlines(state.data, {
    mutedTerms,
    highlightTerms,
    filterQuery,
    sortByLatest,
    readTitles,
    newTitles,
  });

  if (selection.status === "muted") {
    return <NewsMessage>All current headlines match your muted keywords.</NewsMessage>;
  }
  if (selection.status === "unmatched") {
    return <NewsMessage>{`No matches for “${filterQuery}”`}</NewsMessage>;
  }

  const { entries: items, newCount, highlightCount } = selection;
  const isNew = (titleKey: string) => newTitles.has(titleKey) && !readTitles.has(titleKey);

  const list =
    layout === "tiles" ? (
      <ul
        className={`${TILE_GRID_CLASS} scroll-fade min-h-0 flex-1 content-start overflow-y-auto p-1.5`}
      >
        {items.map(({ item, titleKey }) => (
          <li key={item.id} className="min-w-0">
            <HeadlineTile
              item={item}
              now={now}
              openBehavior={openBehavior}
              isRead={readTitles.has(titleKey)}
              isNew={isNew(titleKey)}
              isSaved={savedLinks.has(item.link)}
              highlightTerms={highlightTerms}
              onRead={() => onRead(titleKey)}
              onToggleSaved={() => onToggleSaved(item)}
            />
          </li>
        ))}
      </ul>
    ) : (
      <ul className="scroll-fade flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 py-0.5">
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
              isSaved={savedLinks.has(item.link)}
              highlightTerms={highlightTerms}
              onRead={() => onRead(titleKey)}
              onToggleSaved={() => onToggleSaved(item)}
            />
          </li>
        ))}
      </ul>
    );

  return (
    <div className="flex h-full flex-col">
      {isStale && (
        <div className="text-ink-3 flex items-center gap-1.5 px-2 pb-1.5 text-caption">
          <WifiOff className="size-3 shrink-0" aria-hidden />
          Offline · updated {formatRelativeTime(lastSyncedAt, now)}
        </div>
      )}
      {missingSources.length > 0 && (
        <p className="text-ink-3 flex items-center gap-1.5 px-2 pb-1.5 text-caption">
          <CloudOff className="size-3 shrink-0" aria-hidden />
          {missingSources.map(sourceTab).join(", ")} didn’t load
          <button
            type="button"
            onClick={refresh}
            className="press focus-ring text-ink-2 ml-auto cursor-pointer rounded-sm hover:text-ink"
          >
            Retry
          </button>
        </p>
      )}
      {highlightCount > 0 && (
        <p className="text-ink-3 flex items-center gap-1.5 px-2 pb-1.5 text-caption">
          <Star className="text-primary size-3 shrink-0" aria-hidden />
          {highlightCount} matching your keywords
        </p>
      )}
      {newCount > 0 && (
        <div className="text-ink-3 flex items-center gap-1.5 px-2 pb-1.5 text-caption">
          <span className="bg-primary size-1.5 rounded-full" aria-hidden />
          {newCount} new since your last visit
        </div>
      )}
      {list}
    </div>
  );
}
