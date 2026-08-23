import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_SYMBOLS, useStocksStore } from "@/widgets/stocks/useStocksStore";
import { DEFAULT_INDICES } from "@/widgets/stocks/lib/indices";

const store = () => useStocksStore.getState();
const ID = "stocks-1";
const symbols = (instanceId: string) => store().byInstance[instanceId]?.symbols;

const blank = {
  symbols: [] as string[],
  range: "1d" as const,
  showName: true,
  indexSymbols: [] as string[],
  view: "list" as const,
  changeMode: "percent" as const,
  chartStyle: "line" as const,
  selectedSymbol: null,
};

type Restored = { byInstance: Record<string, Record<string, unknown>> };

function restore(written: unknown): Restored {
  const { merge } = useStocksStore.persist.getOptions();
  return merge?.(written, store()) as Restored;
}

function reloaded() {
  const { partialize } = useStocksStore.persist.getOptions();
  const written = JSON.parse(JSON.stringify(partialize?.(store())));
  return restore(written).byInstance[ID];
}

function persistedEntry(overrides: Record<string, unknown> = {}) {
  return { byInstance: { [ID]: { ...blank, ...overrides } } };
}

beforeEach(() => {
  useStocksStore.setState({
    byInstance: { [ID]: { ...blank } },
    syncNonce: {},
    lastSyncAt: {},
    dataSyncedAt: {},
    syncing: {},
  });
});

describe("useStocksStore", () => {
  it("adds a symbol, normalized to uppercase", () => {
    store().addSymbol(ID, "aapl");
    expect(symbols(ID)).toEqual(["AAPL"]);
  });

  it("shows the symbol you just added instead of the one already on screen", () => {
    store().addSymbol(ID, "aapl");
    store().addSymbol(ID, "msft");

    expect(store().byInstance[ID]?.selectedSymbol).toBe("MSFT");
  });

  it("remembers the symbol you were viewing across a reload", () => {
    store().addSymbol(ID, "aapl");
    store().addSymbol(ID, "msft");
    store().selectSymbol(ID, "AAPL");

    expect(reloaded()?.selectedSymbol).toBe("AAPL");
  });

  it("comes back to the list when nothing was selected", () => {
    store().addSymbol(ID, "aapl");
    store().clearSelection(ID);

    expect(reloaded()?.selectedSymbol).toBeNull();
  });

  it("ignores a blank symbol", () => {
    store().addSymbol(ID, "   ");
    expect(symbols(ID)).toEqual([]);
  });

  it("ignores a duplicate symbol regardless of case", () => {
    store().addSymbol(ID, "AAPL");
    store().addSymbol(ID, "aapl");
    expect(symbols(ID)).toEqual(["AAPL"]);
  });

  it(`caps the watchlist at ${MAX_SYMBOLS}`, () => {
    for (let index = 0; index < MAX_SYMBOLS + 2; index += 1) {
      store().addSymbol(ID, `S${index}`);
    }
    expect(symbols(ID)).toHaveLength(MAX_SYMBOLS);
  });

  it("removes a symbol", () => {
    store().addSymbol(ID, "AAPL");
    store().addSymbol(ID, "MSFT");
    store().removeSymbol(ID, "AAPL");
    expect(symbols(ID)).toEqual(["MSFT"]);
  });

  it("reorders symbols", () => {
    store().addSymbol(ID, "AAPL");
    store().addSymbol(ID, "MSFT");
    store().addSymbol(ID, "TSLA");
    store().reorderSymbols(ID, "TSLA", "AAPL");
    expect(symbols(ID)).toEqual(["TSLA", "AAPL", "MSFT"]);
  });

  it("keeps instances independent", () => {
    const OTHER = "stocks-2";
    useStocksStore.setState((state) => ({
      byInstance: { ...state.byInstance, [OTHER]: { ...blank } },
    }));
    store().addSymbol(ID, "AAPL");
    store().addSymbol(OTHER, "MSFT");
    expect(symbols(ID)).toEqual(["AAPL"]);
    expect(symbols(OTHER)).toEqual(["MSFT"]);
  });

  it("drops an instance on cleanup", () => {
    store().addSymbol(ID, "AAPL");
    store().removeInstance(ID);
    expect(store().byInstance[ID]).toBeUndefined();
  });

  it("sets the chart range", () => {
    store().setRange(ID, "1mo");
    expect(store().byInstance[ID]?.range).toBe("1mo");
  });

  it("toggles the company name", () => {
    store().setShowName(ID, false);
    expect(store().byInstance[ID]?.showName).toBe(false);
  });

  it("switches between the list and the grid", () => {
    store().setView(ID, "grid");
    expect(store().byInstance[ID]?.view).toBe("grid");
  });

  it("shows movement as a percentage until asked for price", () => {
    expect(store().byInstance[ID]?.changeMode).toBe("percent");
    store().setChangeMode(ID, "absolute");
    expect(store().byInstance[ID]?.changeMode).toBe("absolute");
  });

  it("sets the chart style", () => {
    store().setChartStyle(ID, "candle");
    expect(store().byInstance[ID]?.chartStyle).toBe("candle");
  });

  it("selects and clears a symbol", () => {
    store().selectSymbol(ID, "AAPL");
    expect(store().byInstance[ID]?.selectedSymbol).toBe("AAPL");
    store().clearSelection(ID);
    expect(store().byInstance[ID]?.selectedSymbol).toBeNull();
  });

  it("clears the selection when the selected symbol is removed", () => {
    store().addSymbol(ID, "AAPL");
    store().selectSymbol(ID, "AAPL");
    store().removeSymbol(ID, "AAPL");
    expect(store().byInstance[ID]?.selectedSymbol).toBeNull();
  });

  describe("surviving a corrupt persisted value", () => {
    beforeEach(() => {
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
    });

    it("keeps the watchlist when one setting has the wrong type", () => {
      const entry = restore(persistedEntry({ symbols: ["AAPL"], showName: "yes" })).byInstance[ID];
      expect(entry?.symbols).toEqual(["AAPL"]);
      expect(entry?.showName).toBe(true);
    });

    it("keeps the watchlist when the range is one this build no longer offers", () => {
      const entry = restore(persistedEntry({ symbols: ["AAPL"], range: "max" })).byInstance[ID];
      expect(entry?.symbols).toEqual(["AAPL"]);
      expect(entry?.range).toBe("1d");
    });

    it("drops only the unreadable ticker, not the whole watchlist", () => {
      const entry = restore(persistedEntry({ symbols: ["AAPL", 42, "MSFT"] })).byInstance[ID];
      expect(entry?.symbols).toEqual(["AAPL", "MSFT"]);
    });

    it("keeps a healthy instance when another instance is unreadable", () => {
      const restored = restore({
        byInstance: { [ID]: { ...blank, symbols: ["AAPL"] }, broken: "not an object" },
      });
      expect(restored.byInstance[ID]?.symbols).toEqual(["AAPL"]);
      expect(restored.byInstance.broken).toBeUndefined();
    });

    it("trims a watchlist that grew past the cap instead of discarding it", () => {
      const oversized = Array.from({ length: MAX_SYMBOLS + 5 }, (_, index) => `S${index}`);
      const entry = restore(persistedEntry({ symbols: oversized })).byInstance[ID];
      expect(entry?.symbols).toHaveLength(MAX_SYMBOLS);
    });

    it("keeps what is in memory when the whole blob is unusable", () => {
      expect(restore("nonsense").byInstance).toEqual(store().byInstance);
    });

    it("reads an object blob with no watchlists at all", () => {
      expect(restore({}).byInstance).toEqual({});
    });
  });

  it("seeds the index rail from the old show/hide flag", () => {
    const shown = restore(persistedEntry({ showIndices: true, indexSymbols: [] })).byInstance[ID];
    expect(shown?.indexSymbols).toEqual(DEFAULT_INDICES);

    const hidden = restore(persistedEntry({ showIndices: false, indexSymbols: [] })).byInstance[ID];
    expect(hidden?.indexSymbols).toEqual([]);
  });

  it("keeps an explicit index choice over the old flag", () => {
    const entry = restore(persistedEntry({ showIndices: true, indexSymbols: ["^VIX"] })).byInstance[
      ID
    ];
    expect(entry?.indexSymbols).toEqual(["^VIX"]);
  });

  describe("requestRefresh", () => {
    beforeEach(() => {
      store().addSymbol(ID, "AAPL");
      store().addSymbol(ID, "MSFT");
    });

    it("bumps the sync nonce and records the sync time", () => {
      store().requestRefresh(ID);
      expect(store().syncNonce[ID]).toBe(1);
      expect(typeof store().lastSyncAt[ID]).toBe("number");
    });

    it("is a no-op while cooling down", () => {
      store().requestRefresh(ID);
      store().requestRefresh(ID);
      expect(store().syncNonce[ID]).toBe(1);
    });

    it("drops sync state on instance cleanup", () => {
      store().requestRefresh(ID);
      store().removeInstance(ID);
      expect(store().syncNonce[ID]).toBeUndefined();
      expect(store().lastSyncAt[ID]).toBeUndefined();
    });
  });
});
