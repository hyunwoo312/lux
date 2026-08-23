import { describe, expect, it } from "vitest";
import { parseCachedQuote, quoteFromChart } from "@/widgets/stocks/lib/quotes";

const META = {
  symbol: "AAPL",
  currency: "USD",
  priceHint: 2,
  regularMarketPrice: 110,
  chartPreviousClose: 100,
  regularMarketTime: 1_700_000_400,
  shortName: "Apple Inc.",
  regularMarketDayHigh: 112,
  regularMarketDayLow: 99,
  fiftyTwoWeekHigh: 130,
  fiftyTwoWeekLow: 80,
  regularMarketVolume: 5_000,
  fullExchangeName: "NasdaqGS",
  exchangeTimezoneName: "America/New_York",
  instrumentType: "EQUITY",
  currentTradingPeriod: {
    pre: { start: 100, end: 200 },
    regular: { start: 200, end: 400 },
    post: { start: 400, end: 500 },
  },
};

function chart(overrides: Record<string, unknown> = {}) {
  return {
    chart: {
      result: [
        {
          meta: META,
          timestamp: [150, 250, 350, 450],
          indicators: {
            quote: [
              {
                close: [98, 105, 110, 112],
                open: [97, 104, 106, 110],
                high: [99, 106, 111, 113],
                low: [96, 103, 105, 109],
                volume: [10, 20, 30, 40],
              },
            ],
          },
          ...overrides,
        },
      ],
    },
  };
}

describe("quoteFromChart", () => {
  it("keeps the open, high, low and volume the payload already carries", () => {
    const quote = quoteFromChart(chart(), "1y");
    expect(quote.bars[0]).toEqual({
      time: 150,
      close: 98,
      open: 97,
      high: 99,
      low: 96,
      volume: 10,
    });
  });

  it("splits pre-market and after-hours out of the one-day series", () => {
    const quote = quoteFromChart(chart(), "1d");
    expect(quote.bars.map((bar) => bar.time)).toEqual([250, 350]);
    expect(quote.preMarketPrice).toBe(98);
    expect(quote.postMarketPrice).toBe(112);
  });

  it("keeps the whole session in the series on longer ranges", () => {
    expect(quoteFromChart(chart(), "1y").bars).toHaveLength(4);
  });

  it("records where the exchange is so times can be shown in its own clock", () => {
    const quote = quoteFromChart(chart(), "1d");
    expect(quote.exchangeTimezone).toBe("America/New_York");
    expect(quote.exchange).toBe("NasdaqGS");
    expect(quote.instrumentType).toBe("EQUITY");
  });

  it("reads dividends in date order", () => {
    const quote = quoteFromChart(
      chart({
        events: {
          dividends: {
            "2": { amount: 0.26, date: 2 },
            "1": { amount: 0.24, date: 1 },
          },
        },
      }),
      "1y",
    );
    expect(quote.dividends).toEqual([
      { time: 1, amount: 0.24 },
      { time: 2, amount: 0.26 },
    ]);
  });

  it("skips gaps in the close series", () => {
    const quote = quoteFromChart(
      chart({
        timestamp: [250, 260, 270],
        indicators: { quote: [{ close: [105, null, 110] }] },
      }),
      "1d",
    );
    expect(quote.bars.map((bar) => bar.close)).toEqual([105, 110]);
  });

  it("stands in the close for a bar with no open, high or low", () => {
    const quote = quoteFromChart(
      chart({ timestamp: [250], indicators: { quote: [{ close: [105] }] } }),
      "1d",
    );
    expect(quote.bars[0]).toEqual({
      time: 250,
      close: 105,
      open: 105,
      high: 105,
      low: 105,
      volume: null,
    });
  });

  it("keeps an instrument type it does not recognise from failing the parse", () => {
    const raw = chart();
    raw.chart.result[0]!.meta = { ...META, instrumentType: "WARRANT" };
    expect(quoteFromChart(raw, "1d").instrumentType).toBeNull();
  });

  it("says so when the symbol has no data", () => {
    expect(() => quoteFromChart({ chart: { result: [] } }, "1d")).toThrow("Quote data unavailable");
  });

  it("says so when the response is not a chart at all", () => {
    expect(() => quoteFromChart({ nope: true }, "1d")).toThrow("Unexpected quote response");
  });
});

describe("parseCachedQuote", () => {
  it("reads back what it wrote", () => {
    const quote = quoteFromChart(chart(), "1d");
    expect(parseCachedQuote(JSON.parse(JSON.stringify(quote)))).toEqual(quote);
  });

  it("refuses a cache written before bars carried volume", () => {
    const quote = quoteFromChart(chart(), "1d");
    const legacy = { ...quote, bars: undefined, series: [1, 2], timestamps: [1, 2] };
    expect(parseCachedQuote(legacy)).toBeNull();
  });
});
