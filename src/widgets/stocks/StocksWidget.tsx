import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { DragEndEvent } from "@dnd-kit/core";
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { VERTICAL_LIST_MODIFIERS } from "@/lib/dnd";
import { EASE_OUT_QUINT } from "@/lib/motion";
import { peekPolledResource } from "@/widgets/core/usePolledResource";
import { SortableRow } from "@/widgets/core/SortableRow";
import { StockRow } from "@/widgets/stocks/components/StockRow";
import { StockDetail } from "@/widgets/stocks/components/StockDetail";
import { deriveChange, quoteCacheKey, referencePrice } from "@/widgets/stocks/lib/quote";
import { useQuotesVersion } from "@/widgets/stocks/hooks/useQuote";
import { useStocks, useStocksStore } from "@/widgets/stocks/useStocksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type { Quote, StockRange, StockSort } from "@/widgets/stocks/types";

function orderedSymbols(symbols: string[], sort: StockSort, range: StockRange): string[] {
  if (sort === "alpha") return [...symbols].sort((a, b) => a.localeCompare(b));
  if (sort === "change") {
    const percentOf = (symbol: string) => {
      const quote = peekPolledResource<Quote>(quoteCacheKey(symbol, range));
      return quote
        ? deriveChange(quote, referencePrice(quote, range)).percent
        : Number.NEGATIVE_INFINITY;
    };
    return [...symbols].sort((a, b) => percentOf(b) - percentOf(a));
  }
  return symbols;
}

export function StocksWidget() {
  const reduced = useReducedMotion();
  const instanceId = useWidgetInstanceId();
  const symbols = useStocks((d) => d.symbols);
  const range = useStocks((d) => d.range);
  const sort = useStocks((d) => d.sort);
  const selectedSymbol = useStocks((d) => d.selectedSymbol);
  const selectSymbol = useStocksStore((s) => s.selectSymbol);
  const removeSymbol = useStocksStore((s) => s.removeSymbol);
  const reorderSymbols = useStocksStore((s) => s.reorderSymbols);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useQuotesVersion(symbols, range, sort === "change");
  const ordered = orderedSymbols(symbols, sort, range);

  const detail =
    symbols.length === 1
      ? (symbols[0] ?? null)
      : selectedSymbol && symbols.includes(selectedSymbol)
        ? selectedSymbol
        : null;

  const transition = { duration: reduced ? 0 : 0.3, ease: EASE_OUT_QUINT };
  const offset = reduced ? 0 : "4%";

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderSymbols(instanceId, String(active.id), String(over.id));
    }
  };

  return (
    <div className="relative h-full overflow-hidden">
      {symbols.length === 0 ? (
        <div
          className="
            text-muted-foreground flex h-full items-center justify-center px-2 text-center text-sm
          "
        >
          Search above to add a symbol.
        </div>
      ) : (
        <AnimatePresence initial={false} mode="popLayout">
          {detail ? (
            <motion.div
              key="detail"
              className="absolute inset-0"
              initial={{ opacity: 0, y: reduced ? 0 : "-4%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : "-4%" }}
              transition={transition}
            >
              <StockDetail symbol={detail} onRemove={() => removeSymbol(instanceId, detail)} />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              className="absolute inset-0 overflow-x-hidden overflow-y-auto"
              initial={{ opacity: 0, y: offset }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: offset }}
              transition={transition}
            >
              {sort === "manual" ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  modifiers={VERTICAL_LIST_MODIFIERS}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={ordered} strategy={verticalListSortingStrategy}>
                    <ul className="flex flex-col gap-0.5">
                      <AnimatePresence initial={false} mode="popLayout">
                        {ordered.map((symbol) => (
                          <SortableRow key={symbol} id={symbol}>
                            <StockRow
                              symbol={symbol}
                              onSelect={() => selectSymbol(instanceId, symbol)}
                              onRemove={() => removeSymbol(instanceId, symbol)}
                            />
                          </SortableRow>
                        ))}
                      </AnimatePresence>
                    </ul>
                  </SortableContext>
                </DndContext>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {ordered.map((symbol) => (
                    <li key={symbol}>
                      <StockRow
                        symbol={symbol}
                        onSelect={() => selectSymbol(instanceId, symbol)}
                        onRemove={() => removeSymbol(instanceId, symbol)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
