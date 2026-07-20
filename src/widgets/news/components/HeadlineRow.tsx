import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { HeadlineMeta } from "@/widgets/news/components/HeadlineMeta";
import { HighlightedTitle } from "@/widgets/news/components/HighlightedTitle";
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
  highlightTerms,
  onRead,
}: {
  item: NewsItem;
  now: number;
  openBehavior: OpenBehavior;
  withThumbnail: boolean;
  withSource: boolean;
  isRead: boolean;
  isNew: boolean;
  highlightTerms: string[];
  onRead: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const hasImage = item.image !== null && !imageFailed;

  const row = (
    <a
      href={item.link}
      target={openBehavior === "newTab" ? "_blank" : undefined}
      rel="noreferrer"
      onClick={onRead}
      onAuxClick={onRead}
      className="
        group
        hover:bg-foreground/5
        focus-visible:bg-foreground/5
        flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors
      "
    >
      {withThumbnail && (
        <span className="bg-foreground/5 size-11 shrink-0 overflow-hidden rounded-md">
          {hasImage && (
            <img
              src={item.image ?? undefined}
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              onError={() => setImageFailed(true)}
              className="size-full object-cover"
            />
          )}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            "group-hover:text-primary line-clamp-2 text-sm leading-snug",
            isRead ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {isNew && (
            <>
              <span
                className="bg-primary mr-1.5 mb-px inline-block size-1.5 rounded-full"
                aria-hidden
              />
              <span className="sr-only">New</span>
            </>
          )}
          <HighlightedTitle title={item.title} terms={highlightTerms} />
        </span>
        {item.dek && (
          <span
            className={cn(
              "line-clamp-1 text-xs leading-snug",
              isRead ? "text-muted-foreground/70" : "text-muted-foreground",
            )}
          >
            {item.dek}
          </span>
        )}
        <HeadlineMeta item={item} now={now} withSource={withSource} isRead={isRead} />
      </span>
    </a>
  );

  return (
    <Tooltip content={item.title} side="bottom" solid>
      {row}
    </Tooltip>
  );
}
