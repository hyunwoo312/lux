import { describe, expect, it } from "vitest";
import {
  changeOf,
  changeTone,
  directionOf,
  extendedSession,
  isAlwaysOpen,
  marketState,
  referencePrice,
  sparkReference,
} from "@/widgets/stocks/lib/quote";
import type { Quote, SparkSeries } from "@/widgets/stocks/types";

function quote(overrides: Partial<Quote> = {}): Quote {
  return {
    symbol: "AAPL",
    name: "Apple",
    price: 110,
    previousClose: 100,
    currency: "USD",
    priceHint: 2,
    asOf: null,
    sessionStart: null,
    sessionEnd: null,
    preMarketPrice: null,
    postMarketPrice: null,
    preMarketStart: null,
    postMarketEnd: null,
    bars: [],
    dayHigh: null,
    dayLow: null,
    week52High: null,
    week52Low: null,
    volume: null,
    exchange: null,
    exchangeTimezone: null,
    instrumentType: "EQUITY",
    dividends: [],
    ...overrides,
  };
}

describe("changeOf", () => {
  it("reports the move against the reference", () => {
    expect(changeOf(110, 100)).toEqual({ change: 10, percent: 10 });
  });

  it("reports no move rather than dividing by zero", () => {
    expect(changeOf(110, 0)).toEqual({ change: 110, percent: 0 });
  });
});

describe("reference price", () => {
  it("measures a one-day move against the previous close", () => {
    expect(
      referencePrice(
        quote({ bars: [{ time: 1, close: 90, open: 90, high: 90, low: 90, volume: null }] }),
        "1d",
      ),
    ).toBe(100);
  });

  it("measures a longer range against the start of the series", () => {
    const withBars = quote({
      bars: [{ time: 1, close: 90, open: 90, high: 90, low: 90, volume: null }],
    });
    expect(referencePrice(withBars, "1y")).toBe(90);
  });

  it("falls back to the previous close when a longer range has no series", () => {
    expect(referencePrice(quote(), "1y")).toBe(100);
  });

  it("uses the same rule for a batched spark series", () => {
    const series: SparkSeries = {
      symbol: "AAPL",
      price: 110,
      previousClose: 100,
      points: [{ time: 1, close: 90 }],
    };
    expect(sparkReference(series, "1d")).toBe(100);
    expect(sparkReference(series, "1y")).toBe(90);
  });
});

describe("direction", () => {
  it.each([
    [1, "up"],
    [-1, "down"],
    [0, "flat"],
  ])("reads %s as %s", (change, expected) => {
    expect(directionOf(change)).toBe(expected);
  });

  it("colours a rise with the success token, not the widget accent", () => {
    expect(changeTone("up")).toBe("text-success");
    expect(changeTone("down")).toBe("text-destructive");
    expect(changeTone("flat")).toBe("text-ink-3");
  });
});

describe("market state", () => {
  it("is open between the session bounds", () => {
    const data = quote({ sessionStart: 100, sessionEnd: 200 });
    expect(marketState(data, 150_000)).toBe("open");
    expect(marketState(data, 250_000)).toBe("closed");
  });

  it("admits it cannot tell without session bounds", () => {
    expect(marketState(quote(), 1_000)).toBe("unknown");
  });

  it("treats coins and currencies as always trading", () => {
    expect(isAlwaysOpen(quote({ instrumentType: "CRYPTOCURRENCY" }))).toBe(true);
    expect(isAlwaysOpen(quote({ instrumentType: "CURRENCY" }))).toBe(true);
    expect(isAlwaysOpen(quote({ instrumentType: "EQUITY" }))).toBe(false);
  });
});

describe("extendedSession", () => {
  it("measures after-hours against the closing price", () => {
    const data = quote({ sessionEnd: 200, postMarketEnd: 300, postMarketPrice: 121 });
    expect(extendedSession(data, 250_000)).toEqual({
      kind: "post",
      price: 121,
      change: 11,
      percent: 10,
    });
  });

  it("measures pre-market against the previous close", () => {
    const data = quote({ sessionStart: 200, preMarketStart: 100, preMarketPrice: 105 });
    expect(extendedSession(data, 150_000)).toMatchObject({ kind: "pre", percent: 5 });
  });

  it("reports nothing during the regular session", () => {
    const data = quote({ sessionStart: 100, sessionEnd: 200, postMarketPrice: 121 });
    expect(extendedSession(data, 150_000)).toBeNull();
  });
});
