import { X } from "lucide-react";
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
    <button
      type="button"
      aria-label={`Remove ${symbol}`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onRemove();
      }}
      className={cn(
        `
          text-muted-foreground/60
          hover:text-destructive
          grid size-7 place-items-center transition
          [&_svg]:size-4
        `,
        className,
      )}
    >
      <X />
    </button>
  );
}
