import { useState } from "react";
import { faviconUrl } from "@/lib/favicon";
import { relativeTime } from "@/widgets/news/lib/news";
import type { OpenBehavior } from "@/lib/open-url";
import type { NewsItem } from "@/widgets/news/types";

export function HeadlineRow({
  item,
  now,
  openBehavior,
  withThumbnail,
}: {
  item: NewsItem;
  now: number;
  openBehavior: OpenBehavior;
  withThumbnail: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [faviconFailed, setFaviconFailed] = useState(false);

  const hasImage = item.image !== null && !imageFailed;
  const showSource = item.sourceUrl !== null;
  const favicon = item.sourceUrl ? faviconUrl(item.sourceUrl, 32) : null;
  const timeLabel = item.publishedAt !== null ? relativeTime(item.publishedAt, now) : null;

  return (
    <a
      href={item.link}
      target={openBehavior === "newTab" ? "_blank" : undefined}
      rel="noreferrer"
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
              onError={() => setImageFailed(true)}
              className="size-full object-cover"
            />
          )}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-foreground group-hover:text-primary line-clamp-2 text-sm leading-snug">
          {item.title}
        </span>
        {(showSource || timeLabel) && (
          <span className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
            {showSource && (
              <>
                {favicon !== null && !faviconFailed && (
                  <img
                    src={favicon}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    onError={() => setFaviconFailed(true)}
                    className="size-3.5 shrink-0 rounded-sm"
                  />
                )}
                <span className="min-w-0 truncate">{item.source}</span>
              </>
            )}
            {showSource && timeLabel && <span aria-hidden>·</span>}
            {timeLabel && <span className="shrink-0 tabular-nums">{timeLabel}</span>}
          </span>
        )}
      </span>
    </a>
  );
}
