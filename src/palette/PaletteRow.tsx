import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import type { LabelSegment } from "@/widgets/core/types";

type PaletteRowProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  detail?: string;
  meta?: string;
  metaTone?: "positive" | "negative";
  dimmed?: boolean;
  artworkUrl?: string;
  labelSegments?: readonly LabelSegment[];
  selected: boolean;
  onSelect: () => void;
  onPointerMove: () => void;
  id: string;
};

export function PaletteRow({
  icon: Icon,
  title,
  detail,
  meta,
  metaTone,
  dimmed = false,
  artworkUrl,
  labelSegments,
  selected,
  onSelect,
  onPointerMove,
  id,
}: PaletteRowProps) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      onPointerMove={onPointerMove}
      className={cn(
        `
          flex h-10 cursor-pointer items-center gap-[calc(var(--scrollbar-width)*2)] rounded-lg
          border border-transparent px-(--scrollbar-width)
        `,
        selected ? "bg-accent border-border" : "hover:bg-foreground/4",
        dimmed && "opacity-55",
      )}
    >
      {artworkUrl === undefined ? (
        <Icon className={cn("size-6 shrink-0", selected ? "text-ink" : "text-ink-2")} />
      ) : (
        <img
          src={artworkUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="rounded-xs size-6 shrink-0 object-cover"
        />
      )}
      <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
        <span
          className={cn(
            "text-ink text-body flex min-w-0 items-center gap-1 truncate",
            selected && "font-semibold",
          )}
        >
          {labelSegments === undefined
            ? title
            : labelSegments.map((segment, index) =>
                "image" in segment ? (
                  <img
                    key={`${segment.image}-${index}`}
                    src={segment.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-4 shrink-0 object-contain"
                  />
                ) : (
                  <span key={`${segment.text}-${index}`} className="truncate">
                    {segment.text}
                  </span>
                ),
              )}
        </span>
        {detail !== undefined && detail !== "" && (
          <span className="text-ink-3 text-caption min-w-0 flex-1 truncate">· {detail}</span>
        )}
      </span>
      {meta !== undefined && meta !== "" && (
        <span
          className={cn(
            "text-caption shrink-0 truncate tabular-nums",
            metaTone === "positive"
              ? "text-success"
              : metaTone === "negative"
                ? "text-destructive"
                : "text-ink-2",
          )}
        >
          {meta}
        </span>
      )}
    </div>
  );
}
