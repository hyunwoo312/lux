import { SparkStatus } from "@/widgets/stocks/components/SparkStatus";
import { useSparkResource, type SparkResource } from "@/widgets/stocks/hooks/useSparks";
import { performanceReturns, PERFORMANCE_PERIODS } from "@/widgets/stocks/lib/analysis";
import { changeOf, changeTone, directionOf } from "@/widgets/stocks/lib/quote";
import { formatSigned } from "@/widgets/stocks/lib/format";
import { useStocks } from "@/widgets/stocks/useStocksStore";
import { cn } from "@/lib/utils";

export function StockPerformance({
  symbols,
  daily,
  onSelect,
}: {
  symbols: string[];
  daily: SparkResource;
  onSelect: (symbol: string) => void;
}) {
  const watchlist = useStocks((d) => d.symbols);
  const { map, state, refresh, freshness } = useSparkResource(watchlist, "2y");
  return (
    <div className="flex flex-col gap-2">
      <p className="text-ink-3 px-2 text-micro">
        Watchlist price returns · Yahoo Finance · may be delayed
      </p>
      <SparkStatus
        loading={state.status === "loading" || daily.state.status === "loading"}
        failed={state.status === "error" || daily.state.status === "error"}
        loadingLabel="Loading history…"
        failedLabel="History unavailable"
        onRetry={() => {
          if (state.status === "error") refresh();
          if (daily.state.status === "error") daily.refresh();
        }}
      />
      <div className="overflow-x-auto overscroll-x-contain">
        <table className="w-full text-caption tabular-nums slashed-zero">
          <caption className="sr-only">Watchlist price returns</caption>
          <thead>
            <tr className="text-ink-2">
              <th scope="col" className="px-2 py-1 text-left">
                Symbol
              </th>
              {["1D", ...PERFORMANCE_PERIODS].map((period) => (
                <th scope="col" key={period} className="px-2 py-1 text-right whitespace-nowrap">
                  {period}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {symbols.map((symbol) => {
              const day = daily.map?.[symbol];
              const values = [
                day?.points.length ? changeOf(day.price, day.previousClose).percent : null,
                ...performanceReturns(map?.[symbol]),
              ];
              return (
                <tr key={symbol} className="hover:bg-foreground/5">
                  <th scope="row" className="text-left">
                    <button
                      type="button"
                      className="
                        focus-ring text-ink
                        hover:bg-foreground/5
                        block w-full cursor-pointer rounded-md px-2 py-2 text-left font-semibold
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
                        "px-2 py-2 text-right whitespace-nowrap",
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
