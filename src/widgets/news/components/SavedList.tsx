import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
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
  return (
    <Tooltip content={active ? "Back to headlines" : "Saved headlines"}>
      <button
        type="button"
        aria-pressed={active}
        aria-label={active ? "Back to headlines" : `Saved headlines (${count})`}
        onClick={onToggle}
        className={cn(
          `
            press focus-ring flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-md px-2
            transition-colors
          `,
          active
            ? "bg-primary/12 ring-primary/25 text-primary ring-1"
            : "text-ink-3 hover:text-ink",
        )}
      >
        <Bookmark className="size-4 shrink-0" aria-hidden />
        {count > 0 && (
          <span aria-hidden className="text-caption font-semibold tabular-nums">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
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
          entry.item.title.toLowerCase().includes(filter) ||
          entry.item.source.toLowerCase().includes(filter),
      )
    : bookmarks;

  if (bookmarks.length === 0) {
    return (
      <div
        className="
          text-ink-3 flex h-full flex-col items-center justify-center gap-2 px-4 text-center
          text-body
        "
      >
        <Bookmark className="text-ink-4 size-6" aria-hidden />
        <p>Nothing saved yet — use the bookmark on a headline to keep it here.</p>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="text-ink-3 flex h-full items-center justify-center px-4 text-center text-body">
        {`No saved headlines match “${filterQuery}”`}
      </div>
    );
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
