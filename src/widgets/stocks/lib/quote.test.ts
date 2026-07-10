import { describe, expect, it } from "vitest";
import {
  changeTone,
  deriveChange,
  extendedSession,
  marketState,
  referencePrice,
} from "@/widgets/stocks/lib/quote";
import type { Quote } from "@/widgets/stocks/types";

function quote(overrides: Partial<Quote> = {}): Quote {
  return {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 150,
    previousClose: 100,
    currency: "USD",
    priceHint: 2,
    asOf: 0,
    sessionStart: null,
    sessionEnd: null,
    preMarketPrice: null,
    postMarketPrice: null,
    preMarketStart: null,
    postMarketEnd: null,
    series: [],
    timestamps: [],
    dayHigh: null,
    dayLow: null,
    week52High: null,
    week52Low: null,
    volume: null,
    exchange: null,
    ...overrides,
  };
}

describe("referencePrice", () => {
  it("uses the previous close for the intraday range", () => {
    expect(referencePrice(quote({ previousClose: 100, series: [105, 110] }), "1d")).toBe(100);
  });

  it("uses the first datapoint for multi-day ranges", () => {
    expect(referencePrice(quote({ previousClose: 100, series: [105, 110] }), "1mo")).toBe(105);
  });

  it("falls back to the previous close when the series is empty", () => {
    expect(referencePrice(quote({ previousClose: 100, series: [] }), "1y")).toBe(100);
  });
});

describe("deriveChange", () => {
  it("computes absolute and percent change against the reference", () => {
    expect(deriveChange(quote({ price: 150 }), 100)).toEqual({ change: 50, percent: 50 });
  });

  it("guards against a zero reference", () => {
    expect(deriveChange(quote({ price: 5 }), 0)).toEqual({ change: 5, percent: 0 });
  });
});

describe("changeTone", () => {
  it("maps direction to a token class", () => {
    expect(changeTone(1)).toBe("text-primary");
    expect(changeTone(-1)).toBe("text-destructive");
    expect(changeTone(0)).toBe("text-muted-foreground");
  });
});

describe("marketState", () => {
  it("is open within the session and closed outside it", () => {
    const q = quote({ sessionStart: 1000, sessionEnd: 2000 });
    expect(marketState(q, 1500 * 1000)).toBe("open");
    expect(marketState(q, 2500 * 1000)).toBe("closed");
    expect(marketState(q, 500 * 1000)).toBe("closed");
  });

  it("is unknown without a session window", () => {
    expect(marketState(quote(), 1500 * 1000)).toBe("unknown");
  });
});

describe("extendedSession", () => {
  const withExtended = quote({
    price: 200,
    previousClose: 190,
    sessionStart: 1000,
    sessionEnd: 2000,
    preMarketStart: 500,
    postMarketEnd: 3000,
    preMarketPrice: 193,
    postMarketPrice: 202,
  });

  it("reports the after-hours session and its change vs the regular close", () => {
    expect(extendedSession(withExtended, 2500 * 1000)).toEqual({
      kind: "post",
      price: 202,
      change: 2,
      percent: 1,
    });
  });

  it("reports the pre-market session and its change vs the previous close", () => {
    expect(extendedSession(withExtended, 700 * 1000)).toEqual({
      kind: "pre",
      price: 193,
      change: 3,
      percent: (3 / 190) * 100,
    });
  });

  it("is null during the regular session", () => {
    expect(extendedSession(withExtended, 1500 * 1000)).toBeNull();
  });

  it("is null once the extended window has closed", () => {
    expect(extendedSession(withExtended, 3500 * 1000)).toBeNull();
  });

  it("is null when there is no extended-hours price", () => {
    expect(
      extendedSession(quote({ sessionStart: 1000, sessionEnd: 2000 }), 2500 * 1000),
    ).toBeNull();
  });
});
