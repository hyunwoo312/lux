import type { StockRange } from "@/widgets/stocks/types";

export function formatSigned(value: number, digits = 2): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(digits)}`;
}

function magnitudeDecimals(value: number): number {
  const abs = Math.abs(value);
  if (abs === 0 || abs >= 1) return 2;
  if (abs >= 0.01) return 4;
  if (abs >= 0.0001) return 6;
  return 8;
}

export function formatPrice(value: number, currency: string, priceHint = 2): string {
  const maxDigits = Math.min(8, Math.max(priceHint, magnitudeDecimals(value)));
  const options: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDigits,
  };
  try {
    return new Intl.NumberFormat(undefined, options).format(value);
  } catch {
    return value.toFixed(maxDigits);
  }
}

export function formatVolume(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return String(value);
}

export function formatChartTime(seconds: number, range: StockRange): string {
  const date = new Date(seconds * 1000);
  const options: Intl.DateTimeFormatOptions =
    range === "1d"
      ? { hour: "numeric", minute: "2-digit" }
      : range === "5d"
        ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
        : { month: "short", day: "numeric", year: "numeric" };
  return new Intl.DateTimeFormat(undefined, options).format(date);
}
