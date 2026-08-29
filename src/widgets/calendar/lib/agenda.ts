import type {
  CalendarEvent,
  CalendarEventLink,
  CalendarProviderId,
  DisplayCalendarEvent,
} from "@/widgets/calendar/types";
import { localDayKey } from "@/lib/clock";
import { startOfDay } from "@/widgets/calendar/lib/dates";

const monthDayFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

const time12Formatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const time24Formatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function getEventProvider(event: CalendarEvent): CalendarProviderId {
  return event.provider ?? (event.id.startsWith("microsoft-") ? "microsoft" : "google");
}

export function getEventStartDate(event: CalendarEvent): Date {
  return new Date(event.startsAt);
}

export function getEventDisplayEndDate(event: CalendarEvent): Date {
  const endsAt = new Date(event.endsAt);
  return event.isAllDay ? new Date(endsAt.getTime() - 1) : endsAt;
}

export function isMultiDayEvent(event: CalendarEvent): boolean {
  return (
    startOfDay(getEventStartDate(event)).getTime() <
    startOfDay(getEventDisplayEndDate(event)).getTime()
  );
}

export function getEventTitle(event: CalendarEvent): string {
  return event.visibility === "busy" ? "Busy" : event.title;
}

export function compareEventsByStart(first: CalendarEvent, second: CalendarEvent): number {
  return new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime();
}

function getDedupeKey(event: CalendarEvent): string {
  const title = getEventTitle(event).trim().toLowerCase().replace(/\s+/g, " ");
  const startsAt = event.isAllDay
    ? localDayKey(getEventStartDate(event))
    : new Date(event.startsAt).toISOString();
  const endsAt = event.isAllDay
    ? localDayKey(getEventDisplayEndDate(event))
    : new Date(event.endsAt).toISOString();
  return [title, startsAt, endsAt, event.isAllDay ? "all-day" : "timed"].join("|");
}

export function dedupeCalendarEvents(
  events: CalendarEvent[],
  primary: CalendarProviderId = "google",
): DisplayCalendarEvent[] {
  const survivors = new Map<string, CalendarEvent>();
  const linksByKey = new Map<string, CalendarEventLink[]>();

  for (const event of events) {
    const key = getDedupeKey(event);
    const provider = getEventProvider(event);
    const links = linksByKey.get(key) ?? [];
    if (!links.some((link) => link.provider === provider)) {
      links.push({ provider, sourceUrl: event.sourceUrl });
    }
    linksByKey.set(key, links);

    const current = survivors.get(key);
    if (!current || (provider === primary && getEventProvider(current) !== primary)) {
      survivors.set(key, event);
    }
  }

  return Array.from(survivors.entries()).map(([key, event]) => ({
    ...event,
    links: (linksByKey.get(key) ?? []).sort((a, b) =>
      a.provider === primary ? -1 : b.provider === primary ? 1 : 0,
    ),
  }));
}

export function getEventsByDate<T extends CalendarEvent>(events: T[]): Map<string, T[]> {
  const byDate = new Map<string, T[]>();

  for (const event of events) {
    const eventEnd = startOfDay(getEventDisplayEndDate(event));
    for (
      let cursor = startOfDay(getEventStartDate(event));
      cursor <= eventEnd;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      const dateKey = localDayKey(cursor);
      byDate.set(dateKey, [...(byDate.get(dateKey) ?? []), event]);
    }
  }

  return byDate;
}

export function formatEventTime(event: CalendarEvent, hour12: boolean): string {
  if (event.isAllDay) return "All day";
  return (hour12 ? time12Formatter : time24Formatter).format(new Date(event.startsAt));
}

export function formatEventRelativeTime(event: CalendarEvent, now: Date): string | null {
  if (event.isAllDay) return null;
  const diffMs = getEventStartDate(event).getTime() - now.getTime();
  if (diffMs < 0 || diffMs > 12 * 60 * 60 * 1000) return null;
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `in ${minutes}m`;
  return `in ${Math.round(minutes / 60)}h`;
}

export function formatEventDateRange(event: CalendarEvent): string {
  const startsAt = getEventStartDate(event);
  const endsAt = getEventDisplayEndDate(event);
  if (localDayKey(startsAt) === localDayKey(endsAt)) return monthDayFormatter.format(startsAt);
  return `${monthDayFormatter.format(startsAt)} – ${monthDayFormatter.format(endsAt)}`;
}
