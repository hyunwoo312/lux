import { useState } from "react";
import { RemoteImage } from "@/components/media/RemoteImage";
import { cn } from "@/lib/utils";
import { TILE_CAPTION_CLASS } from "@/widgets/news/components/tileStyles";
import { TrendMovementBadge } from "@/widgets/news/components/TrendMovementBadge";
import { searchWeb, type OpenBehavior } from "@/lib/open-url";
import type { TrendItem, TrendMovement } from "@/widgets/news/types";

export function TrendingTile({
  item,
  rank,
  movement,
  openBehavior,
}: {
  item: TrendItem;
  rank: number;
  movement: TrendMovement | null;
  openBehavior: OpenBehavior;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = item.imageUrl !== null && !imageFailed;

  return (
    <button
      type="button"
      onClick={() => searchWeb(item.term, openBehavior)}
      className="
        press focus-ring group bg-foreground/5 relative block aspect-[16/9] w-full overflow-hidden
        rounded-lg
      "
    >
      {hasImage && (
        <RemoteImage
          src={item.imageUrl ?? undefined}
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
      <span
        className={cn(
          "absolute top-2 left-2 rounded-sm px-1 text-micro font-semibold tabular-nums",
          hasImage ? "bg-black/45 text-white" : "bg-foreground/10 text-ink-2",
        )}
      >
        {rank}
      </span>
      <span className="absolute top-2 right-2">
        <TrendMovementBadge movement={movement} onArt={hasImage} />
      </span>
      <span className={TILE_CAPTION_CLASS}>
        <span className={cn("line-clamp-2", hasImage ? "text-white" : "text-ink")}>
          {item.term}
        </span>
      </span>
    </button>
  );
}
