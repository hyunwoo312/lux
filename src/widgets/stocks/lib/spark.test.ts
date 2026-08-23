import { describe, expect, it } from "vitest";
import { parseCachedSparks, sparksFromResponse } from "@/widgets/stocks/lib/spark";

const AAPL = {
  symbol: "AAPL",
  timestamp: [1, 2, 3],
  close: [100, null, 110],
  chartPreviousClose: 95,
  previousClose: 90,
};

describe("sparksFromResponse", () => {
  it("reads a batch of symbols out of one response", () => {
    const map = sparksFromResponse({ AAPL, MSFT: { ...AAPL, symbol: "MSFT" } });
    expect(Object.keys(map).sort()).toEqual(["AAPL", "MSFT"]);
  });

  it("drops gaps in the series instead of drawing through them", () => {
    expect(sparksFromResponse({ AAPL }).AAPL?.points).toEqual([
      { time: 1, close: 100 },
      { time: 3, close: 110 },
    ]);
  });

  it("takes the last traded price as the current price", () => {
    expect(sparksFromResponse({ AAPL }).AAPL?.price).toBe(110);
  });

  it("prefers the chart's own previous close", () => {
    expect(sparksFromResponse({ AAPL }).AAPL?.previousClose).toBe(95);
  });

  it("still reports a market that has not opened yet", () => {
    const map = sparksFromResponse({
      N225: { symbol: "N225", timestamp: [], close: [], previousClose: 38_000 },
    });
    expect(map.N225).toEqual({
      symbol: "N225",
      price: 38_000,
      previousClose: 38_000,
      points: [],
    });
  });

  it("skips a symbol with nothing to anchor a change against", () => {
    expect(sparksFromResponse({ ZZZ: { symbol: "ZZZ" } })).toEqual({});
  });

  it("skips an entry it cannot read rather than failing the batch", () => {
    expect(Object.keys(sparksFromResponse({ AAPL, BAD: 7 }))).toEqual(["AAPL"]);
  });

  it("rejects a response that is not a map of symbols", () => {
    expect(() => sparksFromResponse("nope")).toThrow();
  });
});

describe("parseCachedSparks", () => {
  it("reads back what it wrote", () => {
    const map = sparksFromResponse({ AAPL });
    expect(parseCachedSparks(JSON.parse(JSON.stringify(map)))).toEqual(map);
  });

  it("refuses a cache written by an older shape", () => {
    expect(parseCachedSparks({ AAPL: { symbol: "AAPL", series: [1, 2] } })).toBeNull();
  });
});
