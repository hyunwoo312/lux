import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type IconActionButtonProps = {
  icon: LucideIcon;
  label: string;
  tooltip: ReactNode;
  onClick: () => void;
  size?: "icon-xs" | "icon";
  disabled?: boolean;
  pending?: boolean;
  pressed?: boolean;
};

export function IconActionButton({
  icon: Icon,
  label,
  tooltip,
  onClick,
  size = "icon",
  disabled = false,
  pending = false,
  pressed,
}: IconActionButtonProps) {
  const inert = disabled || pending;

  return (
    <Tooltip content={tooltip}>
      <Button
        type="button"
        variant="ghost"
        size={size}
        aria-label={label}
        aria-disabled={inert || undefined}
        aria-pressed={pressed}
        onClick={inert ? undefined : onClick}
        className={cn(
          "text-ink-3 hover:text-ink",
          pressed &&
            "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
        )}
      >
        <Icon aria-hidden className={cn(pending && "animate-spin")} />
      </Button>
    </Tooltip>
  );
}
