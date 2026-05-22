import type {
  CalendarEvent,
  CalendarEventLink,
  CalendarProviderId,
  DisplayCalendarEvent,
} from "@/widgets/calendar/types";
import {
  addDays,
  endOfDay,
  getDateKey,
  getRangeEndDate,
  startOfDay,
} from "@/widgets/calendar/lib/dates";

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
  return startOfDay(getEventStartDate(event)).getTime() < startOfDay(getEventDisplayEndDate(event)).getTime();
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
    ? getDateKey(getEventStartDate(event))
    : new Date(event.startsAt).toISOString();
  const endsAt = event.isAllDay
    ? getDateKey(getEventDisplayEndDate(event))
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

function isEventActiveOnDate(event: CalendarEvent, date: Date): boolean {
  return (
    getEventDisplayEndDate(event) >= startOfDay(date) && getEventStartDate(event) <= endOfDay(date)
  );
}

export function getEventsInRange<T extends CalendarEvent>(
  events: T[],
  startDate: Date,
  lookaheadDays: number,
): T[] {
  const rangeStart = startOfDay(startDate);
  const rangeEnd = endOfDay(getRangeEndDate(startDate, lookaheadDays));

  return events
    .filter(
      (event) =>
        getEventDisplayEndDate(event) >= rangeStart && getEventStartDate(event) <= rangeEnd,
    )
    .sort((first, second) => getEventStartDate(first).getTime() - getEventStartDate(second).getTime());
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
      const dateKey = getDateKey(cursor);
      byDate.set(dateKey, [...(byDate.get(dateKey) ?? []), event]);
    }
  }

  return byDate;
}

function sortAgendaEvents(first: CalendarEvent, second: CalendarEvent): number {
  if (first.isAllDay !== second.isAllDay) return first.isAllDay ? -1 : 1;
  return getEventStartDate(first).getTime() - getEventStartDate(second).getTime();
}

export function getMultiDayEvents<T extends CalendarEvent>(events: T[]): T[] {
  return events.filter(isMultiDayEvent).sort(sortAgendaEvents);
}

type AgendaGroup<T extends CalendarEvent> = {
  id: string;
  label: string;
  events: T[];
};

function formatDateLabel(date: Date, today: Date): string {
  const tomorrow = addDays(today, 1);
  if (getDateKey(date) === getDateKey(today)) return "Today";
  if (getDateKey(date) === getDateKey(tomorrow)) return "Tomorrow";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function getAgendaGroups<T extends CalendarEvent>(
  events: T[],
  startDate: Date,
  lookaheadDays: number,
  today: Date,
): AgendaGroup<T>[] {
  const groups: AgendaGroup<T>[] = [];
  const rangeEnd = getRangeEndDate(startDate, lookaheadDays);

  for (let cursor = startOfDay(startDate); cursor <= rangeEnd; cursor.setDate(cursor.getDate() + 1)) {
    const date = new Date(cursor);
    const dayEvents = events.filter((event) => isEventActiveOnDate(event, date));
    if (dayEvents.length) {
      groups.push({
        id: getDateKey(date),
        label: formatDateLabel(date, today),
        events: [...dayEvents].sort(sortAgendaEvents),
      });
    }
  }

  return groups;
}

export function formatEventTime(event: CalendarEvent): string {
  if (event.isAllDay) return "All day";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(event.startsAt));
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
  const formatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
  const startsAt = getEventStartDate(event);
  const endsAt = getEventDisplayEndDate(event);
  if (getDateKey(startsAt) === getDateKey(endsAt)) return formatter.format(startsAt);
  return `${formatter.format(startsAt)} – ${formatter.format(endsAt)}`;
}
