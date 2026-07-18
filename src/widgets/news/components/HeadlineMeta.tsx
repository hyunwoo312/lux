import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { faviconUrl } from "@/lib/favicon";
import { formatRelativeTime } from "@/lib/relative-time";
import type { NewsItem } from "@/widgets/news/types";

function formatAlsoIn(alsoIn: string[]): string | null {
  if (alsoIn.length === 0) return null;
  const [first] = alsoIn;
  if (!first) return null;
  const extra = alsoIn.length - 1;
  return extra > 0 ? `also on ${first} +${extra}` : `also on ${first}`;
}

export function HeadlineMeta({
  item,
  now,
  withSource,
  isRead,
  className,
}: {
  item: NewsItem;
  now: number;
  withSource: boolean;
  isRead: boolean;
  className?: string;
}) {
  const [faviconFailed, setFaviconFailed] = useState(false);

  const showSource = item.sourceUrl !== null || withSource;
  const favicon = item.sourceUrl ? faviconUrl(item.sourceUrl, 32) : null;
  const timeLabel = item.publishedAt !== null ? formatRelativeTime(item.publishedAt, now) : null;
  const alsoInLabel = formatAlsoIn(item.alsoIn);

  if (!showSource && !timeLabel && !isRead && !alsoInLabel) return null;

  return (
    <span className={cn("text-muted-foreground flex items-center gap-1.5 text-xs", className)}>
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
              className="size-3.5 shrink-0 rounded-sm"
            />
          )}
          <span className="min-w-0 truncate">{item.source}</span>
        </>
      )}
      {showSource && timeLabel && <span aria-hidden>·</span>}
      {timeLabel && <span className="shrink-0 tabular-nums">{timeLabel}</span>}
      {alsoInLabel && (
        <>
          <span aria-hidden>·</span>
          <span className="min-w-0 truncate">{alsoInLabel}</span>
        </>
      )}
    </span>
  );
}
