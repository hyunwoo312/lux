import { useId } from "react";
import { Bookmark, SearchX } from "lucide-react";
import { RailItem } from "@/components/DialogChrome";
import { StateMessage } from "@/components/StateMessage";
import { cn, matchesQuery } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { NewsStoryList } from "@/widgets/news/components/NewsStoryList";
import { normalizeTitle } from "@/widgets/news/lib/news";
import type { OpenBehavior } from "@/lib/open-url";
import type { Bookmark as SavedItem, NewsItem } from "@/widgets/news/types";

export function SavedToggle({
  count,
  active,
  onToggle,
}: {
  count: number;
  active: boolean;
  onToggle: () => void;
}) {
  const layoutId = useId();
  return (
    <Tooltip content={active ? "Back to headlines" : "Saved headlines"}>
      <RailItem
        active={active}
        layoutId={layoutId}
        aria-pressed={active}
        aria-label={active ? "Back to headlines" : `Saved headlines (${count})`}
        onClick={onToggle}
        dense
        className="h-8 w-auto shrink-0 rounded-md py-0"
      >
        <Bookmark className={cn("size-4 shrink-0", active && "text-primary")} aria-hidden />
        {count > 0 && (
          <span aria-hidden className="text-caption font-semibold tabular-nums">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </RailItem>
    </Tooltip>
  );
}

export function SavedList({
  bookmarks,
  filterQuery,
  now,
  openBehavior,
  highlightTerms,
  onToggleSaved,
  onRead,
  onToggleRead,
  readTitles,
  loadImages,
  unreadOnly,
}: {
  bookmarks: SavedItem[];
  filterQuery: string;
  now: number;
  openBehavior: OpenBehavior;
  highlightTerms: string[];
  onToggleSaved: (item: NewsItem) => void;
  onRead: (title: string) => void;
  onToggleRead: (title: string) => void;
  readTitles: Set<string>;
  loadImages: boolean;
  unreadOnly: boolean;
}) {
  const filter = filterQuery.toLowerCase();
  const visible = filter
    ? bookmarks.filter(
        (entry) =>
          matchesQuery(entry.item.title, filter) || matchesQuery(entry.item.source, filter),
      )
    : bookmarks;

  const emptyState =
    bookmarks.length === 0 ? (
      <StateMessage
        icon={Bookmark}
        message="Nothing saved yet — use the bookmark on a headline to keep it here."
      />
    ) : visible.length === 0 ? (
      <StateMessage icon={SearchX} message={`No saved headlines match “${filterQuery}”`} />
    ) : undefined;

  const items = visible
    .map((entry) => entry.item)
    .filter((item) => !unreadOnly || !readTitles.has(normalizeTitle(item.title)));
  return (
    <NewsStoryList
      items={items}
      label="Saved headlines"
      emptyState={emptyState}
      now={now}
      openBehavior={openBehavior}
      withThumbnail={loadImages}
      withSource
      loadImages={loadImages}
      layout="list"
      readTitles={readTitles}
      newTitles={new Set()}
      highlightTerms={highlightTerms}
      savedLinks={new Set(bookmarks.map((entry) => entry.item.link))}
      onRead={onRead}
      onToggleRead={onToggleRead}
      onToggleSaved={onToggleSaved}
    />
  );
}
