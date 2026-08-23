// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/widgets/stocks/lib/symbols", () => ({
  searchSymbols: vi.fn(),
  fetchTrendingSymbols: vi.fn(),
  parseCachedTrending: () => null,
}));

import { searchSymbols } from "@/widgets/stocks/lib/symbols";
import { StocksSearch } from "@/widgets/stocks/StocksSearch";
import { useStocksStore } from "@/widgets/stocks/useStocksStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import type { SymbolSearchResult } from "@/widgets/stocks/types";

const searchMock = vi.mocked(searchSymbols);
const ID = "stocks-search";

function result(symbol: string, overrides: Partial<SymbolSearchResult> = {}): SymbolSearchResult {
  return {
    symbol,
    name: `${symbol} Inc.`,
    exchange: "NASDAQ",
    sector: "Semiconductors",
    instrumentType: "EQUITY",
    ...overrides,
  };
}

function seed(symbols: string[]) {
  useStocksStore.setState({
    byInstance: {
      [ID]: {
        symbols,
        range: "1d",
        showName: true,
        indexSymbols: [],
        view: "list",
        changeMode: "percent",
        chartStyle: "line",
        selectedSymbol: null,
      },
    },
  });
}

function renderSearch() {
  return render(
    <WidgetInstanceContext.Provider value={ID}>
      <StocksSearch />
    </WidgetInstanceContext.Provider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  seed([]);
});

describe("StocksSearch", () => {
  it("adds a searched symbol to the watchlist", async () => {
    searchMock.mockResolvedValue([result("AAPL"), result("MSFT")]);
    renderSearch();

    fireEvent.change(screen.getByRole("combobox", { name: "Search for a symbol" }), {
      target: { value: "ap" },
    });

    fireEvent.click(await screen.findByRole("option", { name: /AAPL/ }));

    expect(useStocksStore.getState().byInstance[ID]?.symbols).toEqual(["AAPL"]);
  });

  it("disables and does not re-add a symbol already on the watchlist", async () => {
    seed(["AAPL"]);
    searchMock.mockResolvedValue([result("AAPL")]);
    renderSearch();

    fireEvent.click(screen.getByRole("button", { name: "Search for a symbol" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Search for a symbol" }), {
      target: { value: "ap" },
    });

    const option = await screen.findByRole("option", { name: /AAPL/ });
    expect(option).toBeDisabled();
    fireEvent.click(option);
    expect(useStocksStore.getState().byInstance[ID]?.symbols).toEqual(["AAPL"]);
  });
});
