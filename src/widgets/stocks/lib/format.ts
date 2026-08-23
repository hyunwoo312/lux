import type { ChangeMode, StockRange } from "@/widgets/stocks/types";

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

function fractionDigits(value: number, priceHint: number): number {
  return Math.min(8, Math.max(priceHint, magnitudeDecimals(value)));
}

export function formatNumber(value: number, priceHint = 2): string {
  const digits = fractionDigits(value, priceHint);
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatPrice(value: number, currency: string, priceHint = 2): string {
  const digits = fractionDigits(value, priceHint);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: digits,
    }).format(value);
  } catch {
    return value.toFixed(digits);
  }
}

export function formatChange(change: number, percent: number, mode: ChangeMode): string {
  return mode === "percent" ? `${formatSigned(percent)}%` : formatSigned(change);
}

export function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(1, Math.floor(ms / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatVolume(value: number): string {
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return String(value);
}

function withZone(
  options: Intl.DateTimeFormatOptions,
  timeZone: string | null,
): Intl.DateTimeFormatOptions {
  return timeZone ? { ...options, timeZone } : options;
}

function safeFormat(date: Date, options: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat(undefined, options).format(date);
  } catch {
    return new Intl.DateTimeFormat(undefined, { ...options, timeZone: undefined }).format(date);
  }
}

export function formatExchangeTime(ms: number, timeZone: string | null, hour12: boolean): string {
  return safeFormat(
    new Date(ms),
    withZone({ hour: "numeric", minute: "2-digit", hour12, timeZoneName: "short" }, timeZone),
  );
}

export function formatChartTime(
  seconds: number,
  range: StockRange,
  hour12: boolean,
  timeZone: string | null = null,
): string {
  const base: Intl.DateTimeFormatOptions =
    range === "1d"
      ? { hour: "numeric", minute: "2-digit", hour12 }
      : range === "5d"
        ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12 }
        : { month: "short", day: "numeric", year: "numeric" };
  return safeFormat(new Date(seconds * 1000), withZone(base, timeZone));
}
