import { useState } from "react";
import { RemoteImage } from "@/components/media/RemoteImage";
import { cn } from "@/lib/utils";
import { ROW } from "@/lib/row";
import { BookmarkButton } from "@/widgets/news/components/BookmarkButton";
import { HeadlineMeta } from "@/widgets/news/components/HeadlineMeta";
import { HeadlineTitle } from "@/widgets/news/components/HeadlineTitle";
import { isHttpUrl, type OpenBehavior } from "@/lib/open-url";
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
  onPreview,
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
  onPreview?: () => void;
  onToggleSaved: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = item.image !== null && !imageFailed;

  return (
    <div className={cn(ROW.item, "press-row group relative cursor-pointer items-start")}>
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
        <a
          href={isHttpUrl(item.link) ? item.link : undefined}
          target={openBehavior === "newTab" ? "_blank" : undefined}
          rel="noreferrer"
          data-news-link
          onClick={(event) => {
            if (onPreview && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
              event.preventDefault();
              onPreview();
            } else onRead();
          }}
          onAuxClick={onRead}
          className="focus-ring rounded-sm after:absolute after:inset-0"
        >
          <HeadlineTitle
            title={item.title}
            terms={highlightTerms}
            isNew={isNew}
            className={cn(
              "group-hover:underline decoration-ink-3 underline-offset-2 text-body leading-snug",
              isRead ? "text-ink-3" : "text-ink",
            )}
          />
        </a>
        {item.dek && (
          <span className="text-ink-3 text-caption line-clamp-1 leading-snug">{item.dek}</span>
        )}
        <HeadlineMeta
          item={item}
          now={now}
          withSource={withSource}
          isRead={isRead}
          onRead={onRead}
          openBehavior={openBehavior}
          className="relative"
        />
      </span>
      <BookmarkButton
        title={item.title}
        saved={isSaved}
        onToggle={onToggleSaved}
        className="relative self-center"
      />
    </div>
  );
}
