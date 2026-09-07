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
};

export function IconActionButton({
  icon: Icon,
  label,
  tooltip,
  onClick,
  size = "icon",
  disabled = false,
  pending = false,
}: IconActionButtonProps) {
  const inert = disabled || pending;

  return (
    <Tooltip content={tooltip}>
      <Button
        variant="ghost"
        size={size}
        aria-label={label}
        aria-disabled={inert || undefined}
        onClick={inert ? undefined : onClick}
        className="text-ink-3 hover:text-ink"
      >
        <Icon className={cn(pending && "animate-spin")} />
      </Button>
    </Tooltip>
  );
}
