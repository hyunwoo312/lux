import { useState } from "react";
import { RemoteImage } from "@/components/media/RemoteImage";
import { cn } from "@/lib/utils";
import { ROW } from "@/lib/row";
import { TYPE } from "@/lib/type";
import { TrendMovementBadge } from "@/widgets/news/components/TrendMovementBadge";
import { searchWeb, type OpenBehavior } from "@/lib/open-url";
import type { TrendItem, TrendMovement } from "@/widgets/news/types";

export function TrendingRow({
  item,
  rank,
  movement,
  openBehavior,
  withThumbnail,
}: {
  item: TrendItem;
  rank: number;
  movement: TrendMovement | null;
  openBehavior: OpenBehavior;
  withThumbnail: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = item.imageUrl !== null && !imageFailed;
  const headline = item.news[0];

  return (
    <button
      type="button"
      onClick={() => searchWeb(item.term, openBehavior)}
      className={cn(ROW.itemAction, "group w-full items-start")}
    >
      <span className="text-ink-3 w-4 shrink-0 pt-0.5 text-right text-caption tabular-nums slashed-zero">
        {rank}
      </span>

      {withThumbnail && (
        <span className="bg-foreground/5 size-11 shrink-0 overflow-hidden rounded-md">
          {hasImage && (
            <RemoteImage
              src={item.imageUrl ?? undefined}
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
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="text-ink min-w-0 flex-1 truncate text-body font-medium">
            {item.term}
          </span>
          <TrendMovementBadge movement={movement} className="shrink-0" />
        </span>
        <span className={cn(TYPE.rowMeta, "flex min-w-0 items-center gap-1.5")}>
          {item.trafficLabel ? (
            <span className="shrink-0 tabular-nums slashed-zero">{item.trafficLabel}</span>
          ) : null}
          {headline ? (
            <>
              <span aria-hidden>·</span>
              <span className="min-w-0 truncate">
                {headline.source ? `${headline.source} — ` : ""}
                {headline.title}
              </span>
            </>
          ) : null}
        </span>
      </span>
    </button>
  );
}
