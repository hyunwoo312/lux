import type { ReactNode } from "react";
import { ErrorState } from "@/components/StateMessage";
import type { PolledResourceState } from "@/widgets/core/usePolledResource";
import { NewsStoryList } from "@/widgets/news/components/NewsStoryList";
import { NewsNotices } from "@/widgets/news/components/NewsNotices";
import { NewsSkeleton } from "@/widgets/news/components/NewsSkeleton";
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
  onToggleRead: (title: string) => void;
  unreadOnly: boolean;
  loadImages: boolean;
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
  onToggleRead,
  unreadOnly,
  loadImages,
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

  const selection =
    state.status === "success"
      ? selectHeadlines(state.data, {
          mutedTerms,
          highlightTerms,
          filterQuery,
          sortByLatest,
          readTitles,
          newTitles,
          unreadOnly,
        })
      : null;
  const items = selection?.status === "ready" ? selection.entries.map((entry) => entry.item) : [];
  const newCount = selection?.status === "ready" ? selection.newCount : 0;
  const highlightCount = selection?.status === "ready" ? selection.highlightCount : 0;
  const message = !selection
    ? searchQuery
      ? `No results for “${searchQuery}”`
      : "No headlines right now."
    : selection.status === "muted"
      ? "All current headlines match your muted keywords."
      : selection.status === "unmatched"
        ? `No matches for “${filterQuery}”`
        : null;
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <NewsStoryList
          items={items}
          notices={
            <NewsNotices
              missingSources={missingSources}
              refresh={refresh}
              highlightCount={highlightCount}
              newCount={newCount}
            />
          }
          emptyState={message ? <NewsMessage>{message}</NewsMessage> : undefined}
          now={now}
          openBehavior={openBehavior}
          withThumbnail={withThumbnail}
          withSource={withSource}
          loadImages={loadImages}
          layout={layout}
          readTitles={readTitles}
          newTitles={newTitles}
          highlightTerms={highlightTerms}
          savedLinks={savedLinks}
          onRead={onRead}
          onToggleRead={onToggleRead}
          onToggleSaved={onToggleSaved}
        />
      </div>
    </div>
  );
}
