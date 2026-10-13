import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { DragEndEvent } from "@dnd-kit/core";
import { closestCenter, DndContext } from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { GRID_MODIFIERS, useSortableSensors, VERTICAL_LIST_MODIFIERS } from "@/lib/dnd";
import { panelVariants, viewSwap } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useElementSize } from "@/hooks/useElementSize";
import { useNow } from "@/hooks/useNow";
import { SortableRow } from "@/widgets/core/SortableRow";
import { useFreshness } from "@/widgets/core/usePolledResource";
import { useWatchlistQuotes } from "@/widgets/stocks/hooks/useWatchlistQuotes";
import { changeOf } from "@/widgets/stocks/lib/quote";
import { WatchlistTools, type WatchlistSort } from "@/widgets/stocks/components/WatchlistTools";
import { StockPerformance } from "@/widgets/stocks/components/StockPerformance";
import { StockHeatmap } from "@/widgets/stocks/components/StockHeatmap";
import { RangeChips } from "@/widgets/stocks/components/RangeChips";
import { StockRow } from "@/widgets/stocks/components/StockRow";
import { StockCard } from "@/widgets/stocks/components/StockCard";
import { StockDetail } from "@/widgets/stocks/components/StockDetail";
import { IndexRail } from "@/widgets/stocks/components/IndexRail";
import { StocksEmptyState } from "@/widgets/stocks/components/StocksEmptyState";
import { useWatchlistSparks } from "@/widgets/stocks/hooks/useSparks";
import { useDetailSymbol } from "@/widgets/stocks/hooks/useDetailSymbol";
import { gridColumns, showsSparkline } from "@/widgets/stocks/lib/layout";
import { useStocks, useStocksStore } from "@/widgets/stocks/useStocksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function StocksWidget() {
  const reduced = useReducedMotion();
  const instanceId = useWidgetInstanceId();
  const symbols = useStocks((d) => d.symbols);
  const view = useStocks((d) => d.view);
  const range = useStocks((d) => d.range);
  const setRange = useStocksStore((s) => s.setRange);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<WatchlistSort>("manual");
  const [showVolume, setShowVolume] = useState(false);
  const freshness = useFreshness("stocks:");
  const addSymbol = useStocksStore((s) => s.addSymbol);
  const selectSymbol = useStocksStore((s) => s.selectSymbol);
  const removeSymbol = useStocksStore((s) => s.removeSymbol);
  const reorderSymbols = useStocksStore((s) => s.reorderSymbols);

  const [ref, { width }] = useElementSize<HTMLDivElement>();
  const now = useNow().getTime();
  const sensors = useSortableSensors();
  const { map } = useWatchlistSparks();
  const metadata = useWatchlistQuotes();

  const isGrid = view === "grid";
  const showSparkline = showsSparkline(width);
  const detail = useDetailSymbol();
  const search = filter.trim().toLowerCase();
  const shownSymbols = symbols.filter((symbol) => {
    const quote = metadata.quotes[symbol];
    return `${symbol} ${quote?.name ?? ""}`.toLowerCase().includes(search);
  });
  if (sort !== "manual")
    shownSymbols.sort((a, b) => {
      if (sort === "symbol") return a.localeCompare(b);
      if (sort === "volume")
        return (metadata.quotes[b]?.volume ?? -1) - (metadata.quotes[a]?.volume ?? -1);
      const aSeries = map?.[a];
      const bSeries = map?.[b];
      if (!aSeries?.points.length) return bSeries?.points.length ? 1 : 0;
      if (!bSeries?.points.length) return -1;
      const movement =
        changeOf(aSeries.price, aSeries.previousClose).percent -
        changeOf(bSeries.price, bSeries.previousClose).percent;
      return sort === "gainers" ? -movement : movement;
    });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderSymbols(instanceId, String(active.id), String(over.id));
    }
  };

  const renderItem = (symbol: string) => {
    const shared = {
      symbol,
      spark: map?.[symbol],
      now,
      metadata: { quote: metadata.quotes[symbol] ?? null, state: metadata.state },
      onSelect: () => selectSymbol(instanceId, symbol),
      onRemove: () => removeSymbol(instanceId, symbol),
    };
    return isGrid ? (
      <StockCard {...shared} />
    ) : (
      <StockRow {...shared} showSparkline={showSparkline} showVolume={showVolume && width >= 400} />
    );
  };

  return (
    <div ref={ref} className="flex h-full flex-col overflow-hidden">
      <IndexRail />
      {symbols.length > 1 && !detail && (
        <>
          <WatchlistTools
            filter={filter}
            sort={sort}
            onFilter={setFilter}
            onSort={setSort}
            showVolume={showVolume}
            onVolume={() => setShowVolume((value) => !value)}
            allowVolume={view === "list" && width >= 400}
          />
          {isGrid && (
            <div className="shrink-0 pb-1.5">
              <RangeChips value={range} onChange={(next) => setRange(instanceId, next)} />
            </div>
          )}
        </>
      )}
      <div className="relative min-h-0 flex-1">
        {symbols.length === 0 && !detail ? (
          <StocksEmptyState onAdd={(symbol) => addSymbol(instanceId, symbol)} />
        ) : (
          <AnimatePresence initial={false} mode="popLayout">
            {detail ? (
              <motion.div key="detail" className="absolute inset-0" {...viewSwap(reduced, "-4%")}>
                <StockDetail
                  symbol={detail}
                  onRemove={
                    symbols.includes(detail) ? () => removeSymbol(instanceId, detail) : undefined
                  }
                />
              </motion.div>
            ) : (
              <motion.div
                key="list"
                className="scroll-fade absolute inset-0 overflow-x-hidden overflow-y-auto"
                {...viewSwap(reduced, "4%")}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={view}
                    variants={panelVariants(reduced)}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                  >
                    {view === "performance" ? (
                      <StockPerformance
                        symbols={shownSymbols}
                        daily={map}
                        onSelect={(symbol) => selectSymbol(instanceId, symbol)}
                      />
                    ) : view === "heatmap" ? (
                      <StockHeatmap
                        symbols={shownSymbols}
                        daily={map}
                        onSelect={(symbol) => selectSymbol(instanceId, symbol)}
                      />
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        modifiers={isGrid ? GRID_MODIFIERS : VERTICAL_LIST_MODIFIERS}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={shownSymbols}
                          strategy={isGrid ? rectSortingStrategy : verticalListSortingStrategy}
                        >
                          <ul
                            className={cn(isGrid ? "grid gap-1" : "flex flex-col gap-0.5")}
                            style={
                              isGrid
                                ? {
                                    gridTemplateColumns: `repeat(${gridColumns(width)}, minmax(0, 1fr))`,
                                  }
                                : undefined
                            }
                          >
                            <AnimatePresence initial={false} mode="popLayout">
                              {shownSymbols.map((symbol) => (
                                <SortableRow
                                  key={symbol}
                                  id={symbol}
                                  disabled={sort !== "manual" || search.length > 0}
                                >
                                  {renderItem(symbol)}
                                </SortableRow>
                              ))}
                            </AnimatePresence>
                          </ul>
                        </SortableContext>
                      </DndContext>
                    )}
                    {shownSymbols.length === 0 && (
                      <p role="status" className="text-ink-3 p-2 text-caption">
                        No matching symbols.
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
      {!detail && symbols.length > 0 && (
        <p className="text-ink-3 shrink-0 pt-1 text-micro">
          Yahoo Finance · may be delayed
          {freshness.status !== "current" ? " · checking saved data" : ""}
        </p>
      )}
    </div>
  );
}
