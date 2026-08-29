import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { keepPersisted, mergePersisted, tolerantArray, tolerantRecord } from "@/lib/persist";
import { moveById } from "@/lib/dnd";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
import { stalePolledResource } from "@/widgets/core/usePolledResource";
import {
  bumpSyncNonce,
  createSyncSlice,
  isSyncCoolingDown,
  type SyncSlice,
} from "@/widgets/core/syncSlice";
import { quoteKey, sparkKey } from "@/widgets/stocks/lib/cacheKeys";
import { MAX_INDICES } from "@/widgets/stocks/lib/indices";
import {
  CHANGE_MODES,
  CHART_STYLES,
  DAY_RANGE,
  STOCK_RANGES,
  STOCK_VIEWS,
  type ChangeMode,
  type ChartStyle,
  type StockRange,
  type StockView,
} from "@/widgets/stocks/types";

export const MAX_SYMBOLS = 20;
export const STOCKS_SYNC_COOLDOWN_MS = 60_000;

export type StocksData = {
  symbols: string[];
  range: StockRange;
  showName: boolean;
  indexSymbols: string[];
  view: StockView;
  changeMode: ChangeMode;
  chartStyle: ChartStyle;
  selectedSymbol: string | null;
};

type StocksState = SyncSlice & {
  byInstance: Record<string, StocksData>;
  addSymbol: (instanceId: string, symbol: string) => void;
  removeSymbol: (instanceId: string, symbol: string) => void;
  reorderSymbols: (instanceId: string, activeSymbol: string, overSymbol: string) => void;
  setRange: (instanceId: string, range: StockRange) => void;
  setShowName: (instanceId: string, showName: boolean) => void;
  setIndexSymbols: (instanceId: string, indexSymbols: string[]) => void;
  setView: (instanceId: string, view: StockView) => void;
  setChangeMode: (instanceId: string, changeMode: ChangeMode) => void;
  setChartStyle: (instanceId: string, chartStyle: ChartStyle) => void;
  selectSymbol: (instanceId: string, symbol: string) => void;
  clearSelection: (instanceId: string) => void;
  requestSync: (instanceId: string) => void;
  removeInstance: (instanceId: string) => void;
};

const DEFAULT_DATA: StocksData = {
  symbols: ["AAPL", "MSFT", "NVDA", "TSLA"],
  range: "1d",
  showName: true,
  indexSymbols: [],
  view: "list",
  changeMode: "percent",
  chartStyle: "line",
  selectedSymbol: null,
};

const dataSchema = z.object({
  symbols: tolerantArray(z.string()),
  range: z.enum(STOCK_RANGES).catch("1d"),
  showName: z.boolean().catch(true),
  indexSymbols: tolerantArray(z.string()),
  view: z.enum(STOCK_VIEWS).catch("list"),
  changeMode: z.enum(CHANGE_MODES).catch("percent"),
  chartStyle: z.enum(CHART_STYLES).catch("line"),
  selectedSymbol: z.string().nullable().catch(null),
});

const persistedSchema = z.object({ byInstance: tolerantRecord(dataSchema) });

const gatedStorage = createGatedChromeStorage();

function update(
  state: StocksState,
  instanceId: string,
  fn: (data: StocksData) => StocksData,
): Pick<StocksState, "byInstance"> {
  return { byInstance: patchInstance(state.byInstance, instanceId, DEFAULT_DATA, fn) };
}

export const useStocksStore = create<StocksState>()(
  persist(
    (set, get) => ({
      ...createSyncSlice(set),
      byInstance: {},
      addSymbol: (instanceId, symbol) =>
        set((state) => {
          const normalized = symbol.trim().toUpperCase();
          if (!normalized) return state;
          const data = state.byInstance[instanceId] ?? DEFAULT_DATA;
          if (data.symbols.length >= MAX_SYMBOLS) return state;
          if (data.symbols.includes(normalized)) return state;
          return update(state, instanceId, (current) => ({
            ...current,
            symbols: [...current.symbols, normalized],
            selectedSymbol: normalized,
          }));
        }),
      removeSymbol: (instanceId, symbol) =>
        set((state) =>
          update(state, instanceId, (data) => ({
            ...data,
            symbols: data.symbols.filter((entry) => entry !== symbol),
            selectedSymbol: data.selectedSymbol === symbol ? null : data.selectedSymbol,
          })),
        ),
      reorderSymbols: (instanceId, activeSymbol, overSymbol) =>
        set((state) => {
          const data = state.byInstance[instanceId] ?? DEFAULT_DATA;
          const symbols = moveById(data.symbols, activeSymbol, overSymbol, (symbol) => symbol);
          if (!symbols) return state;
          return update(state, instanceId, (current) => ({ ...current, symbols }));
        }),
      setRange: (instanceId, range) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, range }))),
      setShowName: (instanceId, showName) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, showName }))),
      setIndexSymbols: (instanceId, indexSymbols) =>
        set((state) =>
          update(state, instanceId, (data) => ({
            ...data,
            indexSymbols: indexSymbols.slice(0, MAX_INDICES),
          })),
        ),
      setView: (instanceId, view) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, view }))),
      setChangeMode: (instanceId, changeMode) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, changeMode }))),
      setChartStyle: (instanceId, chartStyle) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, chartStyle }))),
      selectSymbol: (instanceId, symbol) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, selectedSymbol: symbol }))),
      clearSelection: (instanceId) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, selectedSymbol: null }))),
      requestSync: (instanceId) => {
        if (isSyncCoolingDown(get(), instanceId, STOCKS_SYNC_COOLDOWN_MS)) return;
        const data = get().byInstance[instanceId];
        if (!data) return;
        stalePolledResource(sparkKey(data.symbols, DAY_RANGE));
        for (const symbol of data.symbols) {
          stalePolledResource(quoteKey(symbol, DAY_RANGE));
          if (data.range !== DAY_RANGE) stalePolledResource(quoteKey(symbol, data.range));
        }
        if (data.indexSymbols.length > 0) {
          stalePolledResource(sparkKey(data.indexSymbols, DAY_RANGE));
        }
        set((state) => bumpSyncNonce(state, instanceId));
      },
      removeInstance: (instanceId) => {
        set((state) => ({ byInstance: dropInstance(state.byInstance, instanceId) }));
        get().dropSync(instanceId);
      },
    }),
    {
      name: "widget:stocks",
      storage: gatedStorage,
      version: 1,
      migrate: keepPersisted,
      onRehydrateStorage: () => () => gatedStorage.open(useStocksStore),
      partialize: (state) => ({
        byInstance: Object.fromEntries(
          Object.entries(state.byInstance).map(([id, data]) => [
            id,
            {
              symbols: data.symbols,
              range: data.range,
              showName: data.showName,
              indexSymbols: data.indexSymbols,
              view: data.view,
              changeMode: data.changeMode,
              chartStyle: data.chartStyle,
              selectedSymbol: data.selectedSymbol,
            },
          ]),
        ),
      }),
      merge: (persisted, current) =>
        mergePersisted("widget:stocks", persistedSchema, persisted, current, (parsed) => {
          const byInstance: Record<string, StocksData> = {};
          for (const [id, data] of Object.entries(parsed.byInstance)) {
            byInstance[id] = {
              symbols: data.symbols.slice(0, MAX_SYMBOLS),
              range: data.range,
              showName: data.showName,
              indexSymbols: data.indexSymbols.slice(0, MAX_INDICES),
              view: data.view,
              changeMode: data.changeMode,
              chartStyle: data.chartStyle,
              selectedSymbol: data.selectedSymbol,
            };
          }
          return { ...current, byInstance };
        }),
    },
  ),
);

export const useStocks = createInstanceSelector(useStocksStore, DEFAULT_DATA);
