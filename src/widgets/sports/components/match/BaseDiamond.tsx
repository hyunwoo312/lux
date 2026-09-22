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
        <g key={base} transform={`translate(${x} ${y}) rotate(45)`}>
          <rect
            x={-3}
            y={-3}
            width={6}
            height={6}
            className="stroke-background fill-none"
            strokeWidth={2.6}
          />
          <rect
            x={-3}
            y={-3}
            width={6}
            height={6}
            className={cn(bases.includes(base) ? "fill-primary" : "fill-none", "stroke-ink-3")}
            strokeWidth={1.2}
          />
        </g>
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
            index < outs ? "bg-destructive" : "border-ink-3 bg-background border",
          )}
        />
      ))}
    </span>
  );
}
