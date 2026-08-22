import { describe, expect, it } from "vitest";
import { parseTraffic } from "@/widgets/news/lib/trend-traffic";

describe("parseTraffic", () => {
  it.each([
    ["200+", 200],
    ["20K+", 20_000],
    ["1M+", 1_000_000],
    ["2B+", 2_000_000_000],
    ["1.5K+", 1_500],
    ["50,000+", 50_000],
    ["500", 500],
    ["  10K+  ", 10_000],
    ["20k+", 20_000],
  ])("reads %s as %s searches", (label, expected) => {
    expect(parseTraffic(label)).toBe(expected);
  });

  it.each([[""], ["lots"], ["+"], ["K+"]])("gives up on %s rather than guessing", (label) => {
    expect(parseTraffic(label)).toBeNull();
  });
});
