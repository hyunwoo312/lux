import type { CalendarEvent, ConnectedCalendar } from "@/widgets/calendar/types";

export function buildCalendarColorMap(calendars: ConnectedCalendar[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const calendar of calendars) {
    if (calendar.backgroundColor) map.set(calendar.id, calendar.backgroundColor);
  }
  return map;
}

export function getEventColor(event: CalendarEvent, colors: Map<string, string>): string {
  return colors.get(event.calendarId) ?? "var(--primary)";
}

function parseHexColor(color: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  const hex = match?.[1];
  if (!hex) return null;
  const value = Number.parseInt(hex, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function getReadableTextColor(color: string): string {
  const rgb = parseHexColor(color);
  if (!rgb) return "#ffffff";
  const [r, g, b] = rgb;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "rgba(0, 0, 0, 0.8)" : "#ffffff";
}
