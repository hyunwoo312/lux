import { describe, expect, it } from "vitest";
import {
  symbolsFromSearch,
  trendingFromResponse,
  parseCachedTrending,
} from "@/widgets/stocks/lib/symbols";

const NVDA = {
  symbol: "NVDA",
  shortname: "NVIDIA Corporation",
  longname: "NVIDIA Corporation",
  exchDisp: "NASDAQ",
  quoteType: "EQUITY",
  sectorDisp: "Technology",
  industryDisp: "Semiconductors",
};

describe("symbolsFromSearch", () => {
  it("keeps the exchange and the line of business the payload already carries", () => {
    expect(symbolsFromSearch({ quotes: [NVDA] })).toEqual([
      {
        symbol: "NVDA",
        name: "NVIDIA Corporation",
        exchange: "NASDAQ",
        sector: "Semiconductors",
        instrumentType: "EQUITY",
      },
    ]);
  });

  it("falls back to the broader sector when there is no industry", () => {
    const withoutIndustry = { ...NVDA, industryDisp: undefined };
    expect(symbolsFromSearch({ quotes: [withoutIndustry] })[0]?.sector).toBe("Technology");
  });

  it("leaves out results that are not tradeable instruments", () => {
    expect(symbolsFromSearch({ quotes: [{ symbol: "X", quoteType: "OPTION" }] })).toEqual([]);
  });

  it("returns nothing rather than failing when there are no matches", () => {
    expect(symbolsFromSearch({})).toEqual([]);
  });

  it("rejects a response it does not recognise", () => {
    expect(() => symbolsFromSearch({ quotes: "nope" })).toThrow();
  });
});

describe("trending", () => {
  it("reads the suggested symbols", () => {
    const raw = { finance: { result: [{ quotes: [{ symbol: "PLTR" }, { symbol: "SOFI" }] }] } };
    expect(trendingFromResponse(raw)).toEqual(["PLTR", "SOFI"]);
  });

  it("copes with an empty result set", () => {
    expect(trendingFromResponse({ finance: { result: null } })).toEqual([]);
  });

  it("only reads back a cached list of strings", () => {
    expect(parseCachedTrending(["A"])).toEqual(["A"]);
    expect(parseCachedTrending({ a: 1 })).toBeNull();
  });
});
