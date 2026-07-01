import { describe, expect, it } from "vitest";
import { formatSigned, formatVolume } from "@/widgets/stocks/lib/format";

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

describe("formatVolume", () => {
  it("abbreviates millions and billions", () => {
    expect(formatVolume(64_460_950)).toBe("64.46M");
    expect(formatVolume(2_300_000_000)).toBe("2.30B");
    expect(formatVolume(5400)).toBe("5.4K");
    expect(formatVolume(640)).toBe("640");
  });
});
