import { cn } from "@/lib/utils";
import { changeOf, changeTone, directionOf } from "@/widgets/stocks/lib/quote";
import { formatSigned } from "@/widgets/stocks/lib/format";
import type { SparkSeries } from "@/widgets/stocks/types";

export function StockHeatmap({
  symbols,
  daily,
  onSelect,
}: {
  symbols: string[];
  daily: Record<string, SparkSeries> | null;
  onSelect: (symbol: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-ink-3 px-2 text-micro">Watchlist · daily movement · equal-sized tiles</p>
      <div className="grid grid-cols-2 gap-1.5 p-1">
        {symbols.map((symbol) => {
          const series = daily?.[symbol];
          const percent = series?.points.length
            ? changeOf(series.price, series.previousClose).percent
            : null;
          return (
            <button
              type="button"
              key={symbol}
              onClick={() => onSelect(symbol)}
              aria-label={`Show ${symbol} details`}
              style={
                percent != null && percent !== 0
                  ? {
                      backgroundColor: `color-mix(in oklab, var(--${percent > 0 ? "success" : "destructive"}) ${Math.min(28, 8 + Math.abs(percent) * 3)}%, transparent)`,
                    }
                  : undefined
              }
              className={cn(
                `
                  focus-ring bg-foreground/5
                  hover:ring-1 hover:ring-primary
                  flex min-h-20 cursor-pointer flex-col items-start justify-between rounded-lg p-3
                  transition-colors
                `,
                percent == null ? "text-ink-3" : changeTone(directionOf(percent)),
              )}
            >
              <span className="text-ink max-w-full truncate text-body font-semibold">{symbol}</span>
              <span className="text-body-lg font-semibold tabular-nums slashed-zero">
                {percent == null ? "—" : `${formatSigned(percent)}%`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
