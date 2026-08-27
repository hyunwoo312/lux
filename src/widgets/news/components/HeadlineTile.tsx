import { useState } from "react";
import { RemoteImage } from "@/components/media/RemoteImage";
import { Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { TILE_CAPTION_CLASS } from "@/widgets/news/components/tileStyles";
import { BookmarkButton } from "@/widgets/news/components/BookmarkButton";
import { HeadlineTitle } from "@/widgets/news/components/HeadlineTitle";
import { SOURCE_ICONS } from "@/widgets/news/components/sourceIcons";
import { compactTime } from "@/widgets/news/lib/news";
import type { OpenBehavior } from "@/lib/open-url";
import type { NewsItem } from "@/widgets/news/types";

export function HeadlineTile({
  item,
  now,
  openBehavior,
  isRead,
  isNew,
  isSaved,
  highlightTerms,
  onRead,
  onToggleSaved,
}: {
  item: NewsItem;
  now: number;
  openBehavior: OpenBehavior;
  isRead: boolean;
  isNew: boolean;
  isSaved: boolean;
  highlightTerms: string[];
  onRead: () => void;
  onToggleSaved: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const hasImage = item.image !== null && !imageFailed;
  const SourceIcon = item.sourceKey ? SOURCE_ICONS[item.sourceKey] : Newspaper;
  const timeLabel = item.publishedAt !== null ? compactTime(item.publishedAt, now) : null;

  const caption = (
    <span className={TILE_CAPTION_CLASS}>
      <HeadlineTitle
        title={item.title}
        terms={highlightTerms}
        isNew={isNew}
        className={cn(isRead ? "text-white/65" : "text-white", timeLabel && "pr-8")}
      />
      {timeLabel && (
        <span className="text-micro absolute right-2 bottom-1 text-white/65 tabular-nums">
          {timeLabel}
        </span>
      )}
    </span>
  );

  return (
    <div
      className="
        press group bg-foreground/5 relative aspect-[16/9] cursor-pointer overflow-hidden rounded-lg
      "
    >
      {hasImage && (
        <RemoteImage
          src={item.image ?? undefined}
          alt=""
          aria-hidden
          onError={() => setImageFailed(true)}
          className="
            absolute inset-0 size-full object-cover transition-transform duration-300
            group-hover:scale-105
            motion-reduce:transition-none
          "
        />
      )}
      <SourceIcon
        className={cn(
          "absolute top-2 left-2 z-10 size-4",
          hasImage ? "text-white drop-shadow-md" : "text-ink-3",
        )}
      />
      <a
        href={item.link}
        target={openBehavior === "newTab" ? "_blank" : undefined}
        rel="noreferrer"
        onClick={onRead}
        onAuxClick={onRead}
        className="focus-ring absolute inset-0 rounded-lg"
      >
        {caption}
      </a>
      <BookmarkButton
        title={item.title}
        saved={isSaved}
        onToggle={onToggleSaved}
        onArt={hasImage}
        className="absolute top-1 right-1 z-10 size-6"
      />
    </div>
  );
}
