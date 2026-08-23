import { describe, expect, it } from "vitest";
import {
  formatChange,
  formatChartTime,
  formatCountdown,
  formatExchangeTime,
  formatNumber,
  formatPrice,
  formatSigned,
  formatVolume,
} from "@/widgets/stocks/lib/format";

describe("formatSigned", () => {
  it.each([
    [1.5, "+1.50"],
    [-1.5, "-1.50"],
    [0, "0.00"],
  ])("writes %s as %s", (value, expected) => {
    expect(formatSigned(value)).toBe(expected);
  });
});

describe("formatNumber", () => {
  it("leaves the currency off so a column of prices lines up", () => {
    expect(formatNumber(1234.5)).toBe("1,234.50");
  });

  it("keeps enough decimals to tell two small prices apart", () => {
    expect(formatNumber(0.0001234)).toBe("0.000123");
  });
});

describe("formatPrice", () => {
  it("names the currency in the detail view", () => {
    expect(formatPrice(1234.5, "USD")).toBe("$1,234.50");
  });

  it("falls back to a plain number for a currency the browser rejects", () => {
    expect(formatPrice(12.5, "NOT-A-CURRENCY")).toBe("12.50");
  });
});

describe("formatChange", () => {
  it("shows percent or price depending on the column mode", () => {
    expect(formatChange(2.5, 1.25, "percent")).toBe("+1.25%");
    expect(formatChange(2.5, 1.25, "absolute")).toBe("+2.50");
  });
});

describe("formatVolume", () => {
  it.each([
    [1_500_000_000_000, "1.50T"],
    [2_400_000_000, "2.40B"],
    [3_500_000, "3.50M"],
    [4_200, "4.2K"],
    [42, "42"],
  ])("shortens %s to %s", (value, expected) => {
    expect(formatVolume(value)).toBe(expected);
  });
});

describe("formatCountdown", () => {
  it.each([
    [90 * 60_000, "1h 30m"],
    [30 * 60_000, "30m"],
    [26 * 60 * 60_000, "1d 2h"],
    [0, "1m"],
  ])("turns %sms into %s", (ms, expected) => {
    expect(formatCountdown(ms)).toBe(expected);
  });
});

describe("exchange clock", () => {
  it("reports the close in the exchange's own timezone, not the reader's", () => {
    const noonUtc = Date.UTC(2026, 0, 5, 21, 0, 0);
    expect(formatExchangeTime(noonUtc, "America/New_York", true)).toContain("4:00 PM");
  });

  it("still prints a time when the timezone is unknown", () => {
    expect(formatExchangeTime(Date.UTC(2026, 0, 5, 21, 0, 0), null, true)).toMatch(/\d/);
  });

  it("falls back to local time for a timezone the browser rejects", () => {
    expect(formatExchangeTime(Date.UTC(2026, 0, 5, 21, 0, 0), "Not/AZone", true)).toMatch(/\d/);
  });
});

describe("formatChartTime", () => {
  it("shows a clock time within a single day", () => {
    expect(formatChartTime(Date.UTC(2026, 0, 5, 21, 0, 0) / 1000, "1d", true, "UTC")).toBe(
      "9:00 PM",
    );
  });

  it("shows a date on longer ranges", () => {
    expect(formatChartTime(Date.UTC(2026, 0, 5, 21, 0, 0) / 1000, "1y", true, "UTC")).toBe(
      "Jan 5, 2026",
    );
  });
});
