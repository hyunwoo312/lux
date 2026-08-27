// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/widgets/stocks/lib/spark", () => ({
  fetchSparks: vi.fn(),
  parseCachedSparks: () => null,
}));
vi.mock("@/widgets/stocks/lib/quotes", () => ({
  fetchQuote: vi.fn(),
  parseCachedQuote: () => null,
}));
vi.mock("@/widgets/stocks/lib/symbols", () => ({
  fetchTrendingSymbols: vi.fn(),
  parseCachedTrending: () => null,
  searchSymbols: vi.fn(),
}));

import { fetchSparks } from "@/widgets/stocks/lib/spark";
import { fetchQuote } from "@/widgets/stocks/lib/quotes";
import { fetchTrendingSymbols } from "@/widgets/stocks/lib/symbols";
import { clearPolledResources } from "@/widgets/core/usePolledResource";
import { StocksWidget } from "@/widgets/stocks/StocksWidget";
import { useStocksStore, type StocksData } from "@/widgets/stocks/useStocksStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Quote, SparkSeries } from "@/widgets/stocks/types";

const fetchSparksMock = vi.mocked(fetchSparks);
const fetchQuoteMock = vi.mocked(fetchQuote);
const fetchTrendingMock = vi.mocked(fetchTrendingSymbols);

function spark(symbol: string, price: number, previousClose: number): SparkSeries {
  return {
    symbol,
    price,
    previousClose,
    points: [
      { time: 1, close: previousClose },
      { time: 2, close: price },
    ],
  };
}

function quote(symbol: string, price: number, previousClose: number): Quote {
  return {
    symbol,
    name: `${symbol} Inc.`,
    price,
    previousClose,
    currency: "USD",
    priceHint: 2,
    asOf: 1,
    sessionStart: null,
    sessionEnd: null,
    preMarketPrice: null,
    postMarketPrice: null,
    preMarketStart: null,
    postMarketEnd: null,
    bars: [
      {
        time: 1,
        close: previousClose,
        open: previousClose,
        high: previousClose,
        low: previousClose,
        volume: 10,
      },
      { time: 2, close: price, open: previousClose, high: price, low: previousClose, volume: 12 },
    ],
    dayHigh: price,
    dayLow: previousClose,
    week52High: price,
    week52Low: previousClose,
    volume: 22,
    exchange: "NasdaqGS",
    exchangeTimezone: "America/New_York",
    instrumentType: "EQUITY",
    dividends: [],
  };
}

function seed(instanceId: string, overrides: Partial<StocksData> = {}) {
  useStocksStore.setState({
    byInstance: {
      [instanceId]: {
        symbols: [],
        range: "1d",
        showName: true,
        indexSymbols: [],
        view: "list",
        changeMode: "percent",
        chartStyle: "line",
        selectedSymbol: null,
        ...overrides,
      },
    },
  });
}

function renderWidget(instanceId: string) {
  return render(
    <TooltipProvider>
      <WidgetInstanceContext.Provider value={instanceId}>
        <StocksWidget />
      </WidgetInstanceContext.Provider>
    </TooltipProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  clearPolledResources();
  fetchSparksMock.mockImplementation((symbols) =>
    Promise.resolve(Object.fromEntries(symbols.map((s) => [s, spark(s, 110, 100)]))),
  );
  fetchQuoteMock.mockImplementation((symbol) => Promise.resolve(quote(symbol, 110, 100)));
  fetchTrendingMock.mockResolvedValue([]);
});

describe("StocksWidget", () => {
  it("fetches every watchlist price in a single request", async () => {
    seed("stocks-batch", { symbols: ["AAPL", "MSFT", "NVDA"] });
    renderWidget("stocks-batch");

    await waitFor(() => expect(screen.getAllByText("110.00")).toHaveLength(3));
    expect(fetchSparksMock).toHaveBeenCalledTimes(1);
    expect(fetchSparksMock.mock.calls[0]?.[0]).toEqual(["AAPL", "MSFT", "NVDA"]);
  });

  it("shows day movement in the grid regardless of the chart range", async () => {
    seed("stocks-grid", { symbols: ["AAPL", "MSFT"], view: "grid", range: "1y" });
    renderWidget("stocks-grid");

    await screen.findAllByText("110.00");
    expect(screen.getAllByText("+10.00%")).toHaveLength(2);
    expect(screen.getAllByText("Day")).toHaveLength(2);
    expect(screen.getAllByText("Vol")).toHaveLength(2);
    expect(fetchSparksMock.mock.calls[0]?.[1]).toBe("1d");
    expect(fetchQuoteMock.mock.calls.every((call) => call[1] === "1d")).toBe(true);
  });

  it("keeps the watchlist in the order the user arranged it", async () => {
    seed("stocks-order", { symbols: ["NVDA", "AAPL", "MSFT"] });
    renderWidget("stocks-order");

    await screen.findAllByText("110.00");
    const labels = screen
      .getAllByRole("button", { name: /Show \w+ details/ })
      .map((row) => row.getAttribute("aria-label"));
    expect(labels).toEqual(["Show NVDA details", "Show AAPL details", "Show MSFT details"]);
  });

  it("removes a symbol when its remove button is clicked", async () => {
    seed("stocks-remove", { symbols: ["TSLA", "NVDA"] });
    renderWidget("stocks-remove");
    await screen.findAllByText("110.00");

    fireEvent.click(screen.getByLabelText("Remove TSLA"));

    expect(useStocksStore.getState().byInstance["stocks-remove"]?.symbols).toEqual(["NVDA"]);
  });

  it("changes the range from the chart's own chips", async () => {
    seed("stocks-range", { symbols: ["AAPL"] });
    renderWidget("stocks-range");
    await screen.findByText("$110.00");

    fireEvent.click(screen.getByRole("radio", { name: "1Y" }));

    await waitFor(() =>
      expect(useStocksStore.getState().byInstance["stocks-range"]?.range).toBe("1y"),
    );
  });

  it("shows the chosen indices in their own batched request", async () => {
    seed("stocks-idx", { symbols: ["IDXA"], indexSymbols: ["^GSPC", "^VIX"] });
    renderWidget("stocks-idx");

    expect(await screen.findByText("S&P 500")).toBeInTheDocument();
    expect(screen.getByText("VIX")).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchSparksMock.mock.calls.map((call) => call[0])).toContainEqual(["^GSPC", "^VIX"]),
    );
  });
});
