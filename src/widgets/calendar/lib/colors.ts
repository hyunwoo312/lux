import type { CalendarEvent, ConnectedCalendar } from "@/widgets/calendar/types";

type Rgb = [number, number, number];

const LIGHT_INK = "#ffffff";
const DARK_INK = "rgba(0, 0, 0, 0.8)";
const DARK_INK_ALPHA = 0.8;
const FALLBACK_EVENT_COLOR = "var(--primary)";
const FALLBACK_INK = "var(--primary-foreground)";

export function buildCalendarColorMap(calendars: ConnectedCalendar[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const calendar of calendars) {
    if (calendar.backgroundColor) map.set(calendar.id, calendar.backgroundColor);
  }
  return map;
}

export function getEventColor(event: CalendarEvent, colors: Map<string, string>): string {
  return colors.get(event.calendarId) ?? FALLBACK_EVENT_COLOR;
}

function parseHexColor(color: string): Rgb | null {
  const digits = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())?.[1];
  if (!digits) return null;
  const hex = digits.length === 3 ? digits.replace(/./g, (digit) => digit + digit) : digits;
  const value = Number.parseInt(hex, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function linearize(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance([r, g, b]: Rgb): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(first: Rgb, second: Rgb): number {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function compositeBlackOver([r, g, b]: Rgb, alpha: number): Rgb {
  const keep = 1 - alpha;
  return [r * keep, g * keep, b * keep];
}

export function getReadableTextColor(color: string): string {
  const background = parseHexColor(color);
  if (!background) return FALLBACK_INK;

  const darkContrast = contrastRatio(compositeBlackOver(background, DARK_INK_ALPHA), background);
  const lightContrast = contrastRatio([255, 255, 255], background);
  return darkContrast > lightContrast ? DARK_INK : LIGHT_INK;
}
