import { Check, Heart, ListPlus, Play } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SpotifyThumb } from "@/widgets/spotify/components/SpotifyThumb";
import type { SpotifySearchResult } from "@/widgets/spotify/types";

type SpotifySearchRowProps = {
  id: string;
  result: SpotifySearchResult;
  active: boolean;
  queueing: boolean;
  queued: boolean;
  onActivate: () => void;
  onPick: () => void;
  onAddToQueue: () => void;
};

export function SpotifySearchRow({
  id,
  result,
  active,
  queueing,
  queued,
  onActivate,
  onPick,
  onAddToQueue,
}: SpotifySearchRowProps) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      onMouseMove={onActivate}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onPick}
      className={cn(
        `
          group flex w-full cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5 text-left
          transition-colors
        `,
        active ? "bg-accent text-primary" : "hover:bg-accent/60",
      )}
    >
      <SpotifyThumb url={result.artworkUrl} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-ink truncate text-body leading-tight">{result.title}</span>
        <span className="text-ink-3 truncate text-caption leading-tight">{result.subtitle}</span>
      </span>
      {result.liked && (
        <Heart className="text-primary size-3.5 shrink-0 fill-current" aria-hidden />
      )}
      {result.kind === "track" && (
        <Tooltip content={queued ? "Added to queue" : "Add to queue"} side="top">
          <button
            type="button"
            aria-label={queued ? "Added to queue" : "Add to queue"}
            disabled={queueing || queued}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.stopPropagation();
              onAddToQueue();
            }}
            className={cn(
              "press cursor-pointer",
              `
                focus-ring grid size-6 shrink-0 place-items-center rounded-sm transition-colors
                disabled:pointer-events-none
              `,
              queued ? "text-primary" : "text-ink-3 hover:text-ink",
              queueing && "opacity-50",
            )}
          >
            {queued ? (
              <Check className="size-3.5" aria-hidden />
            ) : (
              <ListPlus className="size-3.5" aria-hidden />
            )}
          </button>
        </Tooltip>
      )}
      <Play
        className={cn("size-3.5 shrink-0 transition-opacity", active ? "opacity-100" : "opacity-0")}
        aria-hidden
      />
    </div>
  );
}
