import type { ReactNode } from "react";
import { ROW } from "@/lib/row";
import { cn } from "@/lib/utils";

type OptionRowProps = {
  id: string;
  active: boolean;
  disabled?: boolean;
  nested?: boolean;
  onActivate: () => void;
  onPick: () => void;
  className?: string;
  children: ReactNode;
};

export function OptionRow({
  id,
  active,
  disabled = false,
  nested = false,
  onActivate,
  onPick,
  className,
  children,
}: OptionRowProps) {
  const selected = active && !disabled;
  const rowClass = cn(
    ROW.option,
    "text-ink",
    selected && "bg-accent",
    disabled && "opacity-60",
    className,
  );

  if (nested) {
    return (
      <div
        id={id}
        role="option"
        aria-selected={selected}
        aria-disabled={disabled || undefined}
        onMouseMove={onActivate}
        onMouseDown={(event) => event.preventDefault()}
        onClick={disabled ? undefined : onPick}
        className={rowClass}
      >
        {children}
      </div>
    );
  }

  return (
    <button
      type="button"
      id={id}
      role="option"
      aria-selected={selected}
      disabled={disabled}
      onMouseMove={onActivate}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onPick}
      className={rowClass}
    >
      {children}
    </button>
  );
}
