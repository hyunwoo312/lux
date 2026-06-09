import type { ReactNode } from "react";
import { X } from "lucide-react";

export function CustomizeRow({
  icon,
  name,
  description,
  children,
}: {
  icon: ReactNode;
  name: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="
      hover:bg-accent/40
      -mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors
    ">
      {icon}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{name}</span>
        <span className="text-muted-foreground truncate text-xs">{description}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">{children}</div>
    </div>
  );
}

export function ClearButton({ onClear, label }: { onClear: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label={`Clear ${label}`}
      className="
        text-muted-foreground/70
        hover:text-destructive
        focus-visible:ring-ring
        ml-1 grid size-4 shrink-0 scale-90 place-items-center rounded opacity-0 outline-none
        transition-[opacity,transform]
        group-hover:scale-100 group-hover:opacity-100
        focus-visible:scale-100 focus-visible:opacity-100 focus-visible:ring-2
      "
    >
      <X className="size-3.5" aria-hidden />
    </button>
  );
}
