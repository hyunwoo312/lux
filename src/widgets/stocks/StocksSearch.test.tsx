import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/widgets/stocks/lib/yahoo-finance", () => ({
  fetchQuote: vi.fn(),
  searchSymbols: vi.fn(),
  parseCachedQuote: () => null,
}));

import { searchSymbols } from "@/widgets/stocks/lib/yahoo-finance";
import { StocksSearch } from "@/widgets/stocks/StocksSearch";
import { useStocksStore } from "@/widgets/stocks/useStocksStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import type { SymbolSearchResult } from "@/widgets/stocks/types";

const searchMock = vi.mocked(searchSymbols);
const ID = "stocks-search";

function result(symbol: string): SymbolSearchResult {
  return { symbol, name: `${symbol} Inc.`, exchange: "NASDAQ" };
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
  useStocksStore.setState({
    byInstance: {
      [ID]: { symbols: [], range: "1d", showName: true, sort: "manual", selectedSymbol: null },
    },
  });
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
    useStocksStore.setState({
      byInstance: {
        [ID]: {
          symbols: ["AAPL"],
          range: "1d",
          showName: true,
          sort: "manual",
          selectedSymbol: null,
        },
      },
    });
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
