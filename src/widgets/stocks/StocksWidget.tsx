import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { DragEndEvent } from "@dnd-kit/core";
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { GRID_MODIFIERS, VERTICAL_LIST_MODIFIERS } from "@/lib/dnd";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useElementSize } from "@/hooks/useElementSize";
import { SortableRow } from "@/widgets/core/SortableRow";
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
  const addSymbol = useStocksStore((s) => s.addSymbol);
  const selectSymbol = useStocksStore((s) => s.selectSymbol);
  const removeSymbol = useStocksStore((s) => s.removeSymbol);
  const reorderSymbols = useStocksStore((s) => s.reorderSymbols);

  const [ref, { width }] = useElementSize<HTMLDivElement>();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const { map } = useWatchlistSparks();

  const isGrid = view === "grid";
  const showSparkline = showsSparkline(width);
  const detail = useDetailSymbol();

  const transition = { duration: reduced ? 0 : 0.3, ease: EASE_OUT };
  const offset = reduced ? 0 : "4%";

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
      onSelect: () => selectSymbol(instanceId, symbol),
      onRemove: () => removeSymbol(instanceId, symbol),
    };
    return isGrid ? (
      <StockCard {...shared} />
    ) : (
      <StockRow {...shared} showSparkline={showSparkline} />
    );
  };

  return (
    <div ref={ref} className="flex h-full flex-col overflow-hidden">
      <IndexRail />
      <div className="relative min-h-0 flex-1">
        {symbols.length === 0 ? (
          <StocksEmptyState onAdd={(symbol) => addSymbol(instanceId, symbol)} />
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
                className="scroll-fade absolute inset-0 overflow-x-hidden overflow-y-auto"
                initial={{ opacity: 0, y: offset }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: offset }}
                transition={transition}
              >
                <motion.div
                  key={view}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: reduced ? 0 : DURATION.base, ease: EASE_OUT }}
                >
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={isGrid ? GRID_MODIFIERS : VERTICAL_LIST_MODIFIERS}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={symbols}
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
                          {symbols.map((symbol) => (
                            <SortableRow key={symbol} id={symbol}>
                              {renderItem(symbol)}
                            </SortableRow>
                          ))}
                        </AnimatePresence>
                      </ul>
                    </SortableContext>
                  </DndContext>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
