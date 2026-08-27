import { describe, expect, it } from "vitest";
import { getReadableTextColor } from "@/widgets/calendar/lib/colors";

const AA_CONTRAST = 4.5;

const GOOGLE_PALETTE: Record<string, string> = {
  Lavender: "#7986cb",
  Sage: "#33b679",
  Grape: "#8e24aa",
  Flamingo: "#e67c73",
  Banana: "#f6bf26",
  Tangerine: "#f4511e",
  Peacock: "#039be5",
  Graphite: "#616161",
  Blueberry: "#3f51b5",
  Basil: "#0b8043",
  Tomato: "#d50000",
};

const OUTLOOK_PALETTE: Record<string, string> = {
  lightBlue: "#a6c8ff",
  lightGreen: "#a7e3a7",
  lightOrange: "#ffc18c",
  lightGray: "#cfcfcf",
  lightYellow: "#ffe57f",
  lightTeal: "#8fe0d8",
  lightPink: "#ffb3d1",
  lightBrown: "#d4b59e",
  lightRed: "#ff9b9b",
};

type Rgb = [number, number, number];

function toRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const v = channel / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (lr ?? 0) + 0.7152 * (lg ?? 0) + 0.0722 * (lb ?? 0);
}

function contrast(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function inkAgainst(ink: string, background: Rgb): Rgb {
  if (ink === "#ffffff") return [255, 255, 255];
  return [background[0] * 0.2, background[1] * 0.2, background[2] * 0.2];
}

function measure(color: string): number {
  const background = toRgb(color);
  return contrast(inkAgainst(getReadableTextColor(color), background), background);
}

function failingSwatches(palette: Record<string, string>): string[] {
  return Object.entries(palette)
    .filter(([, color]) => measure(color) < AA_CONTRAST)
    .map(([name]) => name);
}

describe("getReadableTextColor", () => {
  it("clears AA on every Google swatch", () => {
    expect(failingSwatches(GOOGLE_PALETTE)).toEqual([]);
  });

  it("clears AA on every Outlook swatch", () => {
    expect(failingSwatches(OUTLOOK_PALETTE)).toEqual([]);
  });

  it("picks dark ink on mid-tone swatches that a brightness threshold reads as dark", () => {
    expect(getReadableTextColor("#7986cb")).toBe("rgba(0, 0, 0, 0.8)");
    expect(getReadableTextColor("#33b679")).toBe("rgba(0, 0, 0, 0.8)");
    expect(getReadableTextColor("#e67c73")).toBe("rgba(0, 0, 0, 0.8)");
    expect(getReadableTextColor("#f4511e")).toBe("rgba(0, 0, 0, 0.8)");
    expect(getReadableTextColor("#039be5")).toBe("rgba(0, 0, 0, 0.8)");
  });

  it("treats shorthand hex as its expanded form", () => {
    expect(getReadableTextColor("#fff")).toBe(getReadableTextColor("#ffffff"));
    expect(getReadableTextColor("#00f")).toBe(getReadableTextColor("#0000ff"));
  });

  it("defers to the paired foreground token when the background is not a hex color", () => {
    expect(getReadableTextColor("var(--primary)")).toBe("var(--primary-foreground)");
    expect(getReadableTextColor("rgb(0, 0, 0)")).toBe("var(--primary-foreground)");
  });
});
