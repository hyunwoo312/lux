import { describe, expect, it } from "vitest";
import {
  formatCountdown,
  formatPrice,
  formatSigned,
  formatVolume,
} from "@/widgets/stocks/lib/format";

describe("formatPrice", () => {
  it("uses two decimals for ordinary prices", () => {
    expect(formatPrice(150.25, "USD", 2)).toContain("150.25");
    expect(formatPrice(60_123.4, "USD", 2)).toContain("123.40");
  });

  it("honors a higher priceHint for FX rates", () => {
    expect(formatPrice(1.0842, "USD", 4)).toContain("1.0842");
  });

  it("shows enough decimals for sub-dollar crypto even when the hint is low", () => {
    expect(formatPrice(0.1234, "USD", 2)).toContain("0.1234");
    expect(formatPrice(0.00001234, "USD", 2)).toContain("0.00001234");
  });
});

describe("formatSigned", () => {
  it("prefixes a plus for positive values", () => {
    expect(formatSigned(1.234)).toBe("+1.23");
  });

  it("keeps the minus for negative values", () => {
    expect(formatSigned(-1.236)).toBe("-1.24");
  });

  it("omits the sign for zero", () => {
    expect(formatSigned(0)).toBe("0.00");
  });
});

describe("formatCountdown", () => {
  it("combines hours and minutes", () => {
    expect(formatCountdown(3 * 3_600_000 + 12 * 60_000)).toBe("3h 12m");
  });

  it("shows minutes only under an hour", () => {
    expect(formatCountdown(12 * 60_000)).toBe("12m");
  });

  it("combines days and hours for multi-day gaps", () => {
    expect(formatCountdown(2 * 86_400_000 + 3 * 3_600_000)).toBe("2d 3h");
  });

  it("rounds sub-minute durations up to one minute", () => {
    expect(formatCountdown(30_000)).toBe("1m");
  });
});

describe("formatVolume", () => {
  it("abbreviates millions and billions", () => {
    expect(formatVolume(64_460_950)).toBe("64.46M");
    expect(formatVolume(2_300_000_000)).toBe("2.30B");
    expect(formatVolume(5400)).toBe("5.4K");
    expect(formatVolume(640)).toBe("640");
  });
});
