import { Check, Heart, ListPlus, Play } from "lucide-react";
import { OptionRow } from "@/components/OptionRow";
import { Button } from "@/components/ui/button";
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
    <OptionRow
      id={id}
      nested
      active={active}
      onActivate={onActivate}
      onPick={onPick}
      className="gap-2.5"
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
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={queued ? "Added to queue" : "Add to queue"}
            disabled={queueing || queued}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.stopPropagation();
              onAddToQueue();
            }}
            className={cn(
              queued ? "text-primary disabled:opacity-100" : "text-ink-3 hover:text-ink",
            )}
          >
            {queued ? <Check aria-hidden /> : <ListPlus aria-hidden />}
          </Button>
        </Tooltip>
      )}
      <Play
        className={cn("size-3.5 shrink-0 transition-opacity", active ? "opacity-100" : "opacity-0")}
        aria-hidden
      />
    </OptionRow>
  );
}
