import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isHttpUrl, type OpenBehavior } from "@/lib/open-url";
import { StoryPreviewBody } from "@/widgets/news/components/StoryPreviewBody";
import type { NewsItem } from "@/widgets/news/types";

type Props = {
  item: NewsItem;
  now: number;
  openBehavior: OpenBehavior;
  loadImages: boolean;
  highlightTerms: string[];
  isRead: boolean;
  isSaved: boolean;
  position: number;
  total: number;
  onBack: () => void;
  onMove: (step: number) => void;
  onRead: () => void;
  onToggleRead: () => void;
  onToggleSaved: () => void;
};

export function StoryPreview({
  item,
  now,
  openBehavior,
  loadImages,
  highlightTerms,
  isRead,
  isSaved,
  position,
  total,
  onBack,
  onMove,
  onRead,
  onToggleRead,
  onToggleSaved,
}: Props) {
  return (
    <section aria-label="Story preview" className="flex h-full min-h-0 flex-col gap-2">
      <span role="status" className="sr-only">
        Story {position + 1} of {total}: {item.title}
      </span>
      <div className="flex shrink-0 items-center gap-1 border-b border-border/50 pb-2">
        <Button
          variant="ghost"
          size="xs"
          onClick={onBack}
          title="Back to headlines (Escape)"
          data-preview-back
        >
          <ArrowLeft aria-hidden /> Headlines
        </Button>
        <span
          className="text-ink-3 ml-auto text-micro tabular-nums"
          aria-label={`Story ${position + 1} of ${total}`}
        >
          {position + 1} / {total}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Previous story"
          title="Previous story (K)"
          disabled={position <= 0}
          onClick={() => onMove(-1)}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Next story"
          title="Next story (J)"
          disabled={position >= total - 1}
          onClick={() => onMove(1)}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
      <StoryPreviewBody
        key={item.link}
        item={item}
        now={now}
        openBehavior={openBehavior}
        loadImages={loadImages}
        highlightTerms={highlightTerms}
        onRead={onRead}
      />
      <div className="flex shrink-0 items-center gap-1 border-t border-border/50 pt-2">
        <Button
          variant="ghost"
          size="xs"
          onClick={onToggleSaved}
          aria-pressed={isSaved}
          title="Save for later (S)"
          className={cn(isSaved && "bg-primary/12 ring-1 ring-inset ring-primary/25")}
        >
          <Bookmark aria-hidden className={cn(isSaved && "text-primary fill-current")} />{" "}
          {isSaved ? "Saved" : "Save"}
        </Button>
        <Button
          variant="ghost"
          size="xs"
          onClick={onToggleRead}
          title="Toggle read status (M)"
          aria-label={isRead ? "Mark unread" : "Mark read"}
        >
          {isRead ? <Check aria-hidden /> : <Circle aria-hidden />} {isRead ? "Read" : "Unread"}
        </Button>
        <Button asChild size="xs" variant="outline" className="ml-auto">
          <a
            href={isHttpUrl(item.link) ? item.link : undefined}
            rel="noreferrer"
            target={openBehavior === "newTab" ? "_blank" : undefined}
            onClick={onRead}
            onAuxClick={onRead}
            title="Open publisher (V)"
          >
            Open <ArrowUpRight aria-hidden />
          </a>
        </Button>
      </div>
    </section>
  );
}
