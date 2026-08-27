import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/StateMessage";
import type { PolledResourceState } from "@/widgets/core/usePolledResource";
import { HeadlineRow } from "@/widgets/news/components/HeadlineRow";
import { HeadlineTile } from "@/widgets/news/components/HeadlineTile";
import { NewsNotices } from "@/widgets/news/components/NewsNotices";
import { NewsSkeleton } from "@/widgets/news/components/NewsSkeleton";
import { TILE_GRID_CLASS } from "@/widgets/news/components/tileStyles";
import { selectHeadlines } from "@/widgets/news/lib/select-headlines";
import type { OpenBehavior } from "@/lib/open-url";
import type { NewsItem, NewsLayout, NewsSource } from "@/widgets/news/types";

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
      <ErrorState
        error={state.error}
        service="The news feed"
        subject="the news"
        onRetry={refresh}
        retrying={isRefreshing}
      />
    );
  }

  if (state.status === "loading") {
    return <NewsSkeleton layout={layout} withThumbnail={withThumbnail} />;
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
        className={cn(
          TILE_GRID_CLASS,
          "scroll-fade min-h-0 flex-1 content-start overflow-y-auto p-1.5",
        )}
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
      <NewsNotices
        missingSources={missingSources}
        refresh={refresh}
        highlightCount={highlightCount}
        newCount={newCount}
      />
      {list}
    </div>
  );
}
