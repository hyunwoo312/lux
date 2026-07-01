import { beforeEach, describe, expect, it } from "vitest";
import { MAX_SYMBOLS, useStocksStore } from "@/widgets/stocks/useStocksStore";

const store = () => useStocksStore.getState();
const ID = "stocks-1";
const symbols = (instanceId: string) => store().byInstance[instanceId]?.symbols;

beforeEach(() => {
  useStocksStore.setState({
    byInstance: {
      [ID]: { symbols: [], range: "1d", showName: true, sort: "manual", selectedSymbol: null },
    },
  });
});

describe("useStocksStore", () => {
  it("adds a symbol, normalized to uppercase", () => {
    store().addSymbol(ID, "aapl");
    expect(symbols(ID)).toEqual(["AAPL"]);
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

  it("sets the sort mode", () => {
    store().setSort(ID, "change");
    expect(store().byInstance[ID]?.sort).toBe("change");
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
});
