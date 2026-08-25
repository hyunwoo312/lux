import { X } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function StockRemoveButton({
  symbol,
  onRemove,
  className,
}: {
  symbol: string;
  onRemove: () => void;
  className?: string;
}) {
  return (
    <Tooltip content={`Remove ${symbol}`}>
      <button
        type="button"
        aria-label={`Remove ${symbol}`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        className={cn(
          "press cursor-pointer focus-ring",
          `
            text-ink-3
            hover:text-ink
            grid size-7 place-items-center rounded-md transition-colors
            [&_svg]:size-4
          `,
          className,
        )}
      >
        <X />
      </button>
    </Tooltip>
  );
}
