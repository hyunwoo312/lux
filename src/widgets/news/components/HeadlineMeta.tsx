import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { faviconUrl } from "@/lib/favicon";
import { formatRelativeTime } from "@/lib/relative-time";
import { RelatedStories } from "@/widgets/news/components/RelatedStories";
import type { OpenBehavior } from "@/lib/open-url";
import type { NewsItem } from "@/widgets/news/types";

export function HeadlineMeta({
  item,
  now,
  withSource,
  isRead,
  openBehavior,
  className,
}: {
  item: NewsItem;
  now: number;
  withSource: boolean;
  isRead: boolean;
  openBehavior: OpenBehavior;
  className?: string;
}) {
  const [faviconFailed, setFaviconFailed] = useState(false);

  const showSource = item.sourceUrl !== null || withSource;
  const favicon = item.sourceUrl ? faviconUrl(item.sourceUrl, 32) : null;
  const timeLabel = item.publishedAt !== null ? formatRelativeTime(item.publishedAt, now) : null;
  const related = item.related;

  if (!showSource && !timeLabel && !isRead && related.length === 0) return null;

  return (
    <span className={cn("text-ink-3 flex items-center gap-1.5 text-caption", className)}>
      {isRead && <Check className="size-3 shrink-0" aria-label="Read" />}
      {showSource && (
        <>
          {favicon !== null && !faviconFailed && (
            <img
              src={favicon}
              alt=""
              aria-hidden
              loading="lazy"
              onError={() => setFaviconFailed(true)}
              className="size-3.5 shrink-0 rounded-xs"
            />
          )}
          <span className="min-w-0 truncate">{item.source}</span>
        </>
      )}
      {showSource && timeLabel && <span aria-hidden>·</span>}
      {timeLabel && <span className="shrink-0 tabular-nums">{timeLabel}</span>}
      {related.length > 0 && (
        <>
          <span aria-hidden>·</span>
          <RelatedStories title={item.title} related={related} openBehavior={openBehavior} />
        </>
      )}
    </span>
  );
}
