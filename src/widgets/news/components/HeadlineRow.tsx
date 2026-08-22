import { useState } from "react";
import { RemoteImage } from "@/components/media/RemoteImage";
import { cn } from "@/lib/utils";
import { ROW } from "@/lib/row";
import { BookmarkButton } from "@/widgets/news/components/BookmarkButton";
import { HeadlineMeta } from "@/widgets/news/components/HeadlineMeta";
import { HeadlineTitle } from "@/widgets/news/components/HeadlineTitle";
import type { OpenBehavior } from "@/lib/open-url";
import type { NewsItem } from "@/widgets/news/types";

export function HeadlineRow({
  item,
  now,
  openBehavior,
  withThumbnail,
  withSource,
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
  withThumbnail: boolean;
  withSource: boolean;
  isRead: boolean;
  isNew: boolean;
  isSaved: boolean;
  highlightTerms: string[];
  onRead: () => void;
  onToggleSaved: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = item.image !== null && !imageFailed;

  return (
    <a
      href={item.link}
      target={openBehavior === "newTab" ? "_blank" : undefined}
      rel="noreferrer"
      onClick={onRead}
      onAuxClick={onRead}
      className={cn(ROW.itemAction, "group items-start")}
    >
      {withThumbnail && (
        <span className="bg-foreground/5 size-11 shrink-0 overflow-hidden rounded-md">
          {hasImage && (
            <RemoteImage
              src={item.image ?? undefined}
              alt=""
              aria-hidden
              fetchPriority="low"
              onError={() => setImageFailed(true)}
              className="size-full object-cover"
            />
          )}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <HeadlineTitle
          title={item.title}
          terms={highlightTerms}
          isNew={isNew}
          className={cn(
            "group-hover:text-primary text-body leading-snug",
            isRead ? "text-ink-3" : "text-ink",
          )}
        />
        {item.dek && (
          <span
            className={cn(
              "line-clamp-1 text-caption leading-snug",
              isRead ? "text-ink-4" : "text-ink-3",
            )}
          >
            {item.dek}
          </span>
        )}
        <HeadlineMeta
          item={item}
          now={now}
          withSource={withSource}
          isRead={isRead}
          openBehavior={openBehavior}
        />
      </span>
      <BookmarkButton
        title={item.title}
        saved={isSaved}
        onToggle={onToggleSaved}
        className="self-center"
      />
    </a>
  );
}
