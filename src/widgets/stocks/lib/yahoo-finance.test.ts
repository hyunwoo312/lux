import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parseCachedQuote,
  quoteFromChart,
  searchSymbols,
  symbolsFromSearch,
} from "@/widgets/stocks/lib/yahoo-finance";
import type { Quote } from "@/widgets/stocks/types";

const meta = {
  currency: "USD",
  priceHint: 4,
  symbol: "AAPL",
  regularMarketTime: 1782849601,
  regularMarketPrice: 289.36,
  shortName: "Apple Inc.",
  longName: "Apple Inc.",
  chartPreviousClose: 281.74,
  previousClose: 281.74,
  regularMarketDayHigh: 291.0,
  regularMarketDayLow: 280.5,
  fiftyTwoWeekHigh: 317.4,
  fiftyTwoWeekLow: 201.5,
  regularMarketVolume: 64460950,
  fullExchangeName: "NasdaqGS",
  currentTradingPeriod: { regular: { start: 1782826200, end: 1782849600 } },
};

const baseResult = {
  meta,
  timestamp: [1782826200, 1782826500, 1782826800],
  indicators: { quote: [{ close: [282.1, null, 289.36] }] },
};

const chartResponse = { chart: { result: [baseResult], error: null } };

describe("quoteFromChart", () => {
  it("maps a chart response to a normalized quote", () => {
    expect(quoteFromChart(chartResponse, "1d")).toEqual({
      symbol: "AAPL",
      name: "Apple Inc.",
      price: 289.36,
      previousClose: 281.74,
      currency: "USD",
      priceHint: 4,
      asOf: 1782849601000,
      sessionStart: 1782826200,
      sessionEnd: 1782849600,
      preMarketPrice: null,
      postMarketPrice: null,
      preMarketStart: null,
      postMarketEnd: null,
      series: [282.1, 289.36],
      timestamps: [1782826200, 1782826800],
      dayHigh: 291.0,
      dayLow: 280.5,
      week52High: 317.4,
      week52Low: 201.5,
      volume: 64460950,
      exchange: "NasdaqGS",
    });
  });

  it("splits pre/post points off the sparkline on the intraday range", () => {
    const withExtended = {
      chart: {
        result: [
          {
            meta: {
              ...meta,
              currentTradingPeriod: {
                pre: { start: 1782812400, end: 1782826200 },
                regular: { start: 1782826200, end: 1782849600 },
                post: { start: 1782849600, end: 1782864000 },
              },
            },
            timestamp: [1782822600, 1782826200, 1782826800, 1782853200],
            indicators: { quote: [{ close: [279.5, 282.1, 289.36, 290.75] }] },
          },
        ],
      },
    };
    const quote = quoteFromChart(withExtended, "1d");
    expect(quote.series).toEqual([282.1, 289.36]);
    expect(quote.timestamps).toEqual([1782826200, 1782826800]);
    expect(quote.preMarketPrice).toBe(279.5);
    expect(quote.postMarketPrice).toBe(290.75);
    expect(quote.preMarketStart).toBe(1782812400);
    expect(quote.postMarketEnd).toBe(1782864000);
  });

  it("keeps every point in the sparkline for multi-day ranges", () => {
    const quote = quoteFromChart(chartResponse, "5d");
    expect(quote.series).toEqual([282.1, 289.36]);
    expect(quote.preMarketPrice).toBeNull();
    expect(quote.postMarketPrice).toBeNull();
  });

  it("falls back to previousClose, then price, when chartPreviousClose is absent", () => {
    const withoutChartClose = {
      chart: { result: [{ ...baseResult, meta: { ...meta, chartPreviousClose: undefined } }] },
    };
    expect(quoteFromChart(withoutChartClose, "1d").previousClose).toBe(281.74);

    const withoutAnyClose = {
      chart: {
        result: [
          {
            ...baseResult,
            meta: { ...meta, chartPreviousClose: undefined, previousClose: undefined },
          },
        ],
      },
    };
    expect(quoteFromChart(withoutAnyClose, "1d").previousClose).toBe(289.36);
  });

  it("throws when the symbol has no result", () => {
    expect(() =>
      quoteFromChart({ chart: { result: null, error: { code: "Not Found" } } }, "1d"),
    ).toThrow();
  });

  it("throws on a malformed response", () => {
    expect(() => quoteFromChart({ chart: { result: [{ meta: {} }] } }, "1d")).toThrow();
  });
});

describe("symbolsFromSearch", () => {
  const searchResponse = {
    quotes: [
      { symbol: "AAPL", shortname: "Apple Inc.", exchDisp: "NASDAQ", quoteType: "EQUITY" },
      {
        symbol: "SPY",
        shortname: "SPDR S&P 500 ETF Trust",
        exchDisp: "NYSEArca",
        quoteType: "ETF",
      },
      { symbol: "^GSPC", shortname: "S&P 500", exchDisp: "SNP", quoteType: "INDEX" },
      { symbol: "BTC-USD", shortname: "Bitcoin USD", exchDisp: "CCC", quoteType: "CRYPTOCURRENCY" },
      { symbol: "EURUSD=X", shortname: "EUR/USD", exchDisp: "CCY", quoteType: "CURRENCY" },
      { symbol: "MUTF", shortname: "Some Fund", exchDisp: "—", quoteType: "MUTUALFUND" },
    ],
  };

  it("keeps equities, ETFs, indices, crypto, and FX; drops other types", () => {
    expect(symbolsFromSearch(searchResponse)).toEqual([
      { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
      { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", exchange: "NYSEArca" },
      { symbol: "^GSPC", name: "S&P 500", exchange: "SNP" },
      { symbol: "BTC-USD", name: "Bitcoin USD", exchange: "CCC" },
      { symbol: "EURUSD=X", name: "EUR/USD", exchange: "CCY" },
    ]);
  });

  it("returns an empty list when there are no quotes", () => {
    expect(symbolsFromSearch({})).toEqual([]);
  });
});

describe("fetchYahoo host fallback", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function httpResponse(status: number, body: unknown = {}): Response {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  }

  it("falls back to the second host when the first is rate limited", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(httpResponse(429))
      .mockResolvedValueOnce(httpResponse(200, { quotes: [] }));
    globalThis.fetch = fetchMock;

    await expect(searchSymbols("aapl")).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("query1");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("query2");
  });

  it("falls back to the second host on a server error", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(httpResponse(503))
      .mockResolvedValueOnce(httpResponse(200, { quotes: [] }));
    globalThis.fetch = fetchMock;

    await expect(searchSymbols("aapl")).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws when every host is rate limited", async () => {
    const fetchMock = vi.fn().mockResolvedValue(httpResponse(429));
    globalThis.fetch = fetchMock;

    await expect(searchSymbols("aapl")).rejects.toThrow(/429/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops without falling back on a fatal 4xx", async () => {
    const fetchMock = vi.fn().mockResolvedValue(httpResponse(404));
    globalThis.fetch = fetchMock;

    await expect(searchSymbols("aapl")).rejects.toThrow(/404/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("parseCachedQuote", () => {
  const valid: Quote = {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 289.36,
    previousClose: 281.74,
    currency: "USD",
    priceHint: 2,
    asOf: 1782849601000,
    sessionStart: 1782826200,
    sessionEnd: 1782849600,
    preMarketPrice: null,
    postMarketPrice: null,
    preMarketStart: null,
    postMarketEnd: null,
    series: [282.1, 289.36],
    timestamps: [1782826200, 1782826800],
    dayHigh: 291.0,
    dayLow: 280.5,
    week52High: 317.4,
    week52Low: 201.5,
    volume: 64460950,
    exchange: "NasdaqGS",
  };

  it("returns the data for a well-formed cached quote", () => {
    expect(parseCachedQuote(valid)).toEqual(valid);
  });

  it("rejects a payload with a wrong field type", () => {
    expect(parseCachedQuote({ ...valid, price: "289.36" })).toBeNull();
  });

  it("rejects a cached quote whose timestamps are misaligned with the series", () => {
    expect(parseCachedQuote({ ...valid, timestamps: [] })).toBeNull();
  });

  it("rejects non-object input", () => {
    expect(parseCachedQuote(null)).toBeNull();
  });
});
