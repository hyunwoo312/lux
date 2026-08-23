import { cn } from "@/lib/utils";
import { TYPE } from "@/lib/type";
import { useElementSize } from "@/hooks/useElementSize";
import { formatNumber } from "@/widgets/stocks/lib/format";
import { changeOf } from "@/widgets/stocks/lib/quote";
import { indexLabel } from "@/widgets/stocks/lib/indices";
import { useIndexSparks } from "@/widgets/stocks/hooks/useSparks";
import { useStocks } from "@/widgets/stocks/useStocksStore";
import { ChangeValue } from "@/widgets/stocks/components/ChangeValue";

const CELL_WIDTH_FOR_LEVEL = 118;

export function IndexRail() {
  const indexSymbols = useStocks((d) => d.indexSymbols);
  const changeMode = useStocks((d) => d.changeMode);
  const [ref, { width }] = useElementSize<HTMLUListElement>();
  const { map } = useIndexSparks();

  const showLevel =
    indexSymbols.length === 0 || width / indexSymbols.length >= CELL_WIDTH_FOR_LEVEL;

  if (indexSymbols.length === 0) return null;

  return (
    <ul
      ref={ref}
      className="
        border-border/50 flex shrink-0 items-stretch justify-between gap-3 border-b px-2 pb-1.5
      "
    >
      {indexSymbols.map((symbol) => {
        const series = map?.[symbol];
        const live = series != null && series.points.length > 0;
        const { change, percent } = series
          ? changeOf(series.price, series.previousClose)
          : { change: 0, percent: 0 };

        return (
          <li key={symbol} className="flex min-w-0 flex-col gap-0.5">
            <span className={cn(TYPE.rowMeta, "truncate")}>{indexLabel(symbol)}</span>
            <span className="flex min-w-0 items-baseline gap-1.5">
              {showLevel ? (
                <span className="text-ink truncate text-caption font-medium tabular-nums slashed-zero">
                  {series ? formatNumber(series.price) : "—"}
                </span>
              ) : null}
              {live ? (
                <ChangeValue
                  change={change}
                  percent={percent}
                  mode={changeMode}
                  className="shrink-0 text-micro"
                />
              ) : (
                <span className="text-ink-4 shrink-0 text-micro">—</span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
