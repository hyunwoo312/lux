import { useId } from "react";
import { Bookmark, SearchX } from "lucide-react";
import { RailItem } from "@/components/DialogChrome";
import { StateMessage } from "@/components/StateMessage";
import { cn, matchesQuery } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { HeadlineRow } from "@/widgets/news/components/HeadlineRow";
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
}: {
  bookmarks: SavedItem[];
  filterQuery: string;
  now: number;
  openBehavior: OpenBehavior;
  highlightTerms: string[];
  onToggleSaved: (item: NewsItem) => void;
}) {
  const filter = filterQuery.toLowerCase();
  const visible = filter
    ? bookmarks.filter(
        (entry) =>
          matchesQuery(entry.item.title, filter) || matchesQuery(entry.item.source, filter),
      )
    : bookmarks;

  if (bookmarks.length === 0) {
    return (
      <StateMessage
        icon={Bookmark}
        message="Nothing saved yet — use the bookmark on a headline to keep it here."
      />
    );
  }

  if (visible.length === 0) {
    return <StateMessage icon={SearchX} message={`No saved headlines match “${filterQuery}”`} />;
  }

  return (
    <ul
      aria-label="Saved headlines"
      className="scroll-fade flex h-full min-h-0 flex-col gap-0.5 overflow-y-auto px-1.5 py-0.5"
    >
      {visible.map((entry) => (
        <li key={entry.item.link}>
          <HeadlineRow
            item={entry.item}
            now={now}
            openBehavior={openBehavior}
            withThumbnail={entry.item.image !== null}
            withSource
            isRead={false}
            isNew={false}
            isSaved
            highlightTerms={highlightTerms}
            onRead={() => undefined}
            onToggleSaved={() => onToggleSaved(entry.item)}
          />
        </li>
      ))}
    </ul>
  );
}
