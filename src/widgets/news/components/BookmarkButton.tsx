import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { ROW } from "@/lib/row";
import { cn } from "@/lib/utils";

export function BookmarkButton({
  title,
  saved,
  onToggle,
  onArt = false,
  className,
}: {
  title: string;
  saved: boolean;
  onToggle: () => void;
  onArt?: boolean;
  className?: string;
}) {
  const label = saved ? `Remove “${title}” from saved` : `Save “${title}” for later`;

  return (
    <Tooltip content={saved ? "Saved" : "Save for later"}>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={label}
        aria-pressed={saved}
        onClick={onToggle}
        className={cn(
          onArt
            ? "text-white/70 hover:bg-white/15 hover:text-white"
            : cn("hover:text-ink", saved ? "text-primary" : "text-ink-3"),
          !saved && ROW.reveal,
          className,
        )}
      >
        <Bookmark className={cn(saved && "fill-current")} aria-hidden />
      </Button>
    </Tooltip>
  );
}
