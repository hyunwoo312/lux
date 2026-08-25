import type { MouseEvent } from "react";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

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

  const press = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onToggle();
  };

  return (
    <Tooltip content={saved ? "Saved" : "Save for later"}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={saved}
        onClick={press}
        className={cn(
          `
            press focus-ring flex size-7 shrink-0 cursor-pointer items-center justify-center
            rounded-sm transition-opacity
          `,
          onArt
            ? "text-white/70 hover:text-white"
            : cn("hover:text-ink", saved ? "text-primary" : "text-ink-3"),
          !saved && "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
          saved && "opacity-100",
          className,
        )}
      >
        <Bookmark className={cn("size-4 shrink-0", saved && "fill-current")} aria-hidden />
      </button>
    </Tooltip>
  );
}
