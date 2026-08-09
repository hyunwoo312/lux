import { cn } from "@/lib/utils";

const BASES = [
  { base: 2, x: 11, y: 4 },
  { base: 3, x: 4, y: 11 },
  { base: 1, x: 18, y: 11 },
];

export function BaseDiamond({ bases }: { bases: number[] }) {
  return (
    <svg viewBox="0 0 22 15" className="h-3.5 w-5 shrink-0" aria-hidden>
      {BASES.map(({ base, x, y }) => (
        <rect
          key={base}
          x={-3}
          y={-3}
          width={6}
          height={6}
          transform={`translate(${x} ${y}) rotate(45)`}
          className={cn(
            bases.includes(base) ? "fill-primary" : "fill-none",
            "stroke-muted-foreground/40",
          )}
          strokeWidth={1.2}
        />
      ))}
    </svg>
  );
}

export function OutDots({ outs }: { outs: number }) {
  return (
    <span aria-hidden className="flex shrink-0 items-center gap-0.5">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={cn(
            "size-1.5 rounded-full",
            index < outs ? "bg-destructive" : "border-muted-foreground/40 border",
          )}
        />
      ))}
    </span>
  );
}
