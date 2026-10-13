import { useSparkResource } from "@/widgets/stocks/hooks/useSparks";
import { periodReturn } from "@/widgets/stocks/lib/analysis";
import { changeOf, changeTone, directionOf } from "@/widgets/stocks/lib/quote";
import { formatSigned } from "@/widgets/stocks/lib/format";
import type { SparkSeries } from "@/widgets/stocks/types";
import { cn } from "@/lib/utils";

const PERIODS = ["1W", "1M", "YTD", "1Y"] as const;

function returns(series: SparkSeries | undefined): (number | null)[] {
  const points = series?.points ?? [];
  const last = points.at(-1);
  if (!last) return PERIODS.map(() => null);
  const date = new Date(last.time * 1000);
  const week = new Date(date);
  week.setUTCDate(week.getUTCDate() - 7);
  const month = new Date(date);
  month.setUTCDate(1);
  month.setUTCMonth(month.getUTCMonth() - 1);
  const monthEnd = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
  ).getUTCDate();
  month.setUTCDate(Math.min(date.getUTCDate(), monthEnd));
  const year = new Date(date);
  year.setUTCFullYear(year.getUTCFullYear() - 1);
  const ytd = Date.UTC(date.getUTCFullYear(), 0, 1) / 1000 - 1;
  return [week.getTime() / 1000, month.getTime() / 1000, ytd, year.getTime() / 1000].map(
    (boundary) => periodReturn(points, boundary),
  );
}

export function StockPerformance({
  symbols,
  daily,
  onSelect,
}: {
  symbols: string[];
  daily: Record<string, SparkSeries> | null;
  onSelect: (symbol: string) => void;
}) {
  const { map, state, refresh, freshness } = useSparkResource(symbols, "2y");
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <table className="w-full text-caption tabular-nums">
          <caption className="text-ink-3 pb-2 text-left text-micro">
            Watchlist price returns · Yahoo Finance · may be delayed
          </caption>
          <thead>
            <tr className="text-ink-2">
              <th scope="col" className="px-2 py-1 text-left">
                Symbol
              </th>
              {["1D", ...PERIODS].map((period) => (
                <th scope="col" key={period} className="px-2 py-1 text-right">
                  {period}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {symbols.map((symbol) => {
              const day = daily?.[symbol];
              const values = [
                day?.points.length ? changeOf(day.price, day.previousClose).percent : null,
                ...returns(map?.[symbol]),
              ];
              return (
                <tr key={symbol} className="hover:bg-foreground/5">
                  <th scope="row" className="text-left">
                    <button
                      type="button"
                      className="
                        focus-ring text-ink cursor-pointer rounded-md px-2 py-2 font-semibold
                      "
                      onClick={() => onSelect(symbol)}
                    >
                      {symbol}
                    </button>
                  </th>
                  {values.map((value, index) => (
                    <td
                      key={index}
                      className={cn(
                        "px-2 py-2 text-right",
                        value == null ? "text-ink-3" : changeTone(directionOf(value)),
                      )}
                    >
                      {value == null ? "—" : `${formatSigned(value)}%`}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {state.status === "loading" && (
        <p role="status" className="text-ink-3 text-caption">
          Loading history…
        </p>
      )}
      {state.status === "error" && (
        <button
          type="button"
          onClick={refresh}
          className="focus-ring text-warning cursor-pointer rounded-md p-2 text-caption"
        >
          History unavailable · Retry
        </button>
      )}
      {freshness.status !== "current" && map && (
        <p role="status" className="text-warning text-caption">
          Showing saved history. Refresh to check for updates.
        </p>
      )}
      <p className="text-ink-3 px-2 text-micro">
        — means the baseline close is unavailable. Dates follow the latest supplied daily bar.
        Returns exclude dividends and currency conversion.
      </p>
    </div>
  );
}
