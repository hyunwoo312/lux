import { useState } from "react";
import { RemoteImage } from "@/components/media/RemoteImage";
import { Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { BookmarkButton } from "@/widgets/news/components/BookmarkButton";
import { HeadlineTitle } from "@/widgets/news/components/HeadlineTitle";
import { SOURCE_ICONS } from "@/widgets/news/components/sourceIcons";
import { compactTime } from "@/widgets/news/lib/news";
import type { OpenBehavior } from "@/lib/open-url";
import type { NewsItem } from "@/widgets/news/types";

const CAPTION = `
  art-scrim absolute inset-x-0 bottom-0 block h-[calc(2lh+0.5rem)] px-2 py-1 text-caption
  leading-snug font-medium
`;

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
    <span className={CAPTION}>
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
    <a
      href={item.link}
      target={openBehavior === "newTab" ? "_blank" : undefined}
      rel="noreferrer"
      onClick={onRead}
      onAuxClick={onRead}
      className="
        press focus-ring group bg-foreground/5 relative block aspect-[16/9] overflow-hidden
        rounded-lg
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
          "absolute top-2 left-2 size-4",
          hasImage ? "text-white drop-shadow-md" : "text-ink-3",
        )}
      />
      <BookmarkButton
        title={item.title}
        saved={isSaved}
        onToggle={onToggleSaved}
        onArt={hasImage}
        className="absolute top-1 right-1 size-6"
      />
      {caption}
    </a>
  );
}
