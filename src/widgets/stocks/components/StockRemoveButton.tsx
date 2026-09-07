import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Remove ${symbol}`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        className={cn("text-ink-3 hover:text-ink", className)}
      >
        <X />
      </Button>
    </Tooltip>
  );
}
