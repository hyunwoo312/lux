import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { registerInstanceCleanup } from "@/widgets/core/instanceCleanup";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
import { invalidatePolledResource } from "@/widgets/core/usePolledResource";
import { syncCooldownRemainingMs } from "@/widgets/core/syncCooldown";
import { quoteCacheKey } from "@/widgets/stocks/lib/quote";
import { STOCK_RANGES, STOCK_SORTS, type StockRange, type StockSort } from "@/widgets/stocks/types";

export const MAX_SYMBOLS = 20;
export const STOCKS_SYNC_COOLDOWN_MS = 60_000;

type StocksData = {
  symbols: string[];
  range: StockRange;
  showName: boolean;
  sort: StockSort;
  selectedSymbol: string | null;
};

type StocksState = {
  byInstance: Record<string, StocksData>;
  syncNonce: Record<string, number>;
  lastSyncAt: Record<string, number>;
  syncing: Record<string, number>;
  addSymbol: (instanceId: string, symbol: string) => void;
  removeSymbol: (instanceId: string, symbol: string) => void;
  reorderSymbols: (instanceId: string, activeSymbol: string, overSymbol: string) => void;
  setRange: (instanceId: string, range: StockRange) => void;
  setShowName: (instanceId: string, showName: boolean) => void;
  setSort: (instanceId: string, sort: StockSort) => void;
  selectSymbol: (instanceId: string, symbol: string) => void;
  clearSelection: (instanceId: string) => void;
  beginSync: (instanceId: string) => void;
  endSync: (instanceId: string) => void;
  requestRefresh: (instanceId: string) => void;
  removeInstance: (instanceId: string) => void;
};

const DEFAULT_DATA: StocksData = {
  symbols: [],
  range: "1d",
  showName: true,
  sort: "manual",
  selectedSymbol: null,
};

const dataSchema = z.object({
  symbols: z.array(z.string()).max(MAX_SYMBOLS).default([]),
  range: z.enum(STOCK_RANGES).default("1d"),
  showName: z.boolean().default(true),
  sort: z.enum(STOCK_SORTS).default("manual"),
});

const persistedSchema = z.object({
  byInstance: z.record(z.string(), dataSchema),
});

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
      byInstance: {},
      syncNonce: {},
      lastSyncAt: {},
      syncing: {},
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
          const from = data.symbols.indexOf(activeSymbol);
          const to = data.symbols.indexOf(overSymbol);
          if (from === -1 || to === -1 || from === to) return state;
          const symbols = [...data.symbols];
          const [moved] = symbols.splice(from, 1);
          if (moved === undefined) return state;
          symbols.splice(to, 0, moved);
          return update(state, instanceId, (current) => ({ ...current, symbols }));
        }),
      setRange: (instanceId, range) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, range }))),
      setShowName: (instanceId, showName) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, showName }))),
      setSort: (instanceId, sort) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, sort }))),
      selectSymbol: (instanceId, symbol) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, selectedSymbol: symbol }))),
      clearSelection: (instanceId) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, selectedSymbol: null }))),
      beginSync: (instanceId) =>
        set((state) => ({
          syncing: { ...state.syncing, [instanceId]: (state.syncing[instanceId] ?? 0) + 1 },
        })),
      endSync: (instanceId) =>
        set((state) => ({
          syncing: {
            ...state.syncing,
            [instanceId]: Math.max(0, (state.syncing[instanceId] ?? 0) - 1),
          },
        })),
      requestRefresh: (instanceId) => {
        const remainingMs = syncCooldownRemainingMs(
          get().lastSyncAt[instanceId],
          STOCKS_SYNC_COOLDOWN_MS,
        );
        if (remainingMs > 0) return;
        const data = get().byInstance[instanceId];
        if (!data) return;
        for (const symbol of data.symbols) {
          invalidatePolledResource(quoteCacheKey(symbol, data.range));
        }
        set((state) => ({
          syncNonce: { ...state.syncNonce, [instanceId]: (state.syncNonce[instanceId] ?? 0) + 1 },
          lastSyncAt: { ...state.lastSyncAt, [instanceId]: Date.now() },
        }));
      },
      removeInstance: (instanceId) =>
        set((state) => ({
          byInstance: dropInstance(state.byInstance, instanceId),
          syncNonce: dropInstance(state.syncNonce, instanceId),
          lastSyncAt: dropInstance(state.lastSyncAt, instanceId),
          syncing: dropInstance(state.syncing, instanceId),
        })),
    }),
    {
      name: "widget:stocks",
      storage: gatedStorage,
      version: 1,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({
        byInstance: Object.fromEntries(
          Object.entries(state.byInstance).map(([id, data]) => [
            id,
            { symbols: data.symbols, range: data.range, showName: data.showName, sort: data.sort },
          ]),
        ),
      }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        const byInstance: Record<string, StocksData> = {};
        for (const [id, data] of Object.entries(parsed.data.byInstance)) {
          byInstance[id] = {
            symbols: data.symbols,
            range: data.range,
            showName: data.showName,
            sort: data.sort,
            selectedSymbol: null,
          };
        }
        return { ...current, byInstance };
      },
    },
  ),
);

registerInstanceCleanup((instanceId) => useStocksStore.getState().removeInstance(instanceId));

export const useStocks = createInstanceSelector(useStocksStore, DEFAULT_DATA);
