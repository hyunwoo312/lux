// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/widgets/stocks/lib/yahoo-finance", () => ({
  fetchQuote: vi.fn(),
  searchSymbols: vi.fn(),
  parseCachedQuote: () => null,
}));

import { fetchQuote } from "@/widgets/stocks/lib/yahoo-finance";
import { StocksWidget } from "@/widgets/stocks/StocksWidget";
import { useStocksStore } from "@/widgets/stocks/useStocksStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import type { Quote } from "@/widgets/stocks/types";

const fetchQuoteMock = vi.mocked(fetchQuote);

function quote(symbol: string, price: number, previousClose: number): Quote {
  return {
    symbol,
    name: `${symbol} Inc.`,
    price,
    previousClose,
    currency: "USD",
    asOf: 1,
    sessionStart: null,
    sessionEnd: null,
    series: [previousClose, price],
    timestamps: [1, 2],
    dayHigh: null,
    dayLow: null,
    week52High: null,
    week52Low: null,
    volume: null,
    exchange: null,
  };
}

function renderWidget(instanceId: string) {
  return render(
    <WidgetInstanceContext.Provider value={instanceId}>
      <StocksWidget />
    </WidgetInstanceContext.Provider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  fetchQuoteMock.mockImplementation((symbol) => Promise.resolve(quote(symbol, 110, 100)));
});

describe("StocksWidget", () => {
  it("shows the empty prompt when there are no symbols", () => {
    useStocksStore.setState({
      byInstance: {
        "stocks-empty": {
          symbols: [],
          range: "1d",
          showName: true,
          sort: "manual",
          selectedSymbol: null,
        },
      },
    });
    renderWidget("stocks-empty");
    expect(screen.getByText("Search above to add a symbol.")).toBeInTheDocument();
  });

  it("renders a row with the live quote for each symbol", async () => {
    useStocksStore.setState({
      byInstance: {
        "stocks-rows": {
          symbols: ["AAPL", "MSFT"],
          range: "1d",
          showName: true,
          sort: "manual",
          selectedSymbol: null,
        },
      },
    });
    renderWidget("stocks-rows");

    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("MSFT")).toBeInTheDocument();
    const prices = await screen.findAllByText("$110.00");
    expect(prices).toHaveLength(2);
    expect(screen.getAllByText("+10.00 (+10.00%)")).toHaveLength(2);
  });

  it("reorders the watchlist as quotes load when sorted by % change", async () => {
    fetchQuoteMock.mockImplementation((symbol) =>
      Promise.resolve(symbol === "AMZN" ? quote("AMZN", 120, 100) : quote("GOOG", 105, 100)),
    );
    useStocksStore.setState({
      byInstance: {
        "stocks-sort": {
          symbols: ["GOOG", "AMZN"],
          range: "1d",
          showName: true,
          sort: "change",
          selectedSymbol: null,
        },
      },
    });
    renderWidget("stocks-sort");

    await waitFor(() => {
      const labels = screen
        .getAllByRole("button", { name: /Show \w+ details/ })
        .map((row) => row.getAttribute("aria-label"));
      expect(labels).toEqual(["Show AMZN details", "Show GOOG details"]);
    });
  });

  it("removes a symbol when its remove button is clicked", async () => {
    useStocksStore.setState({
      byInstance: {
        "stocks-remove": {
          symbols: ["TSLA", "NVDA"],
          range: "1d",
          showName: true,
          sort: "manual",
          selectedSymbol: null,
        },
      },
    });
    renderWidget("stocks-remove");
    await screen.findAllByText("$110.00");

    fireEvent.click(screen.getByLabelText("Remove TSLA"));

    expect(useStocksStore.getState().byInstance["stocks-remove"]?.symbols).toEqual(["NVDA"]);
  });

  it("shows the detailed view for a single-symbol watchlist", async () => {
    useStocksStore.setState({
      byInstance: {
        "stocks-detail": {
          symbols: ["AAPL"],
          range: "1d",
          showName: true,
          sort: "manual",
          selectedSymbol: null,
        },
      },
    });
    renderWidget("stocks-detail");

    await screen.findByText("$110.00");
    expect(screen.getByText("Prev close")).toBeInTheDocument();
    expect(screen.getByText("$100.00")).toBeInTheDocument();
  });

  it("opens the detail view when a row is clicked", async () => {
    useStocksStore.setState({
      byInstance: {
        "stocks-open": {
          symbols: ["AAPL", "MSFT"],
          range: "1d",
          showName: true,
          sort: "manual",
          selectedSymbol: null,
        },
      },
    });
    renderWidget("stocks-open");
    await screen.findAllByText("$110.00");

    fireEvent.click(screen.getByRole("button", { name: "Show AAPL details" }));

    expect(useStocksStore.getState().byInstance["stocks-open"]?.selectedSymbol).toBe("AAPL");
    expect(screen.getByText("Prev close")).toBeInTheDocument();
  });
});