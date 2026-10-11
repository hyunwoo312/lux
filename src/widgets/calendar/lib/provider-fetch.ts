import type { ZodType } from "zod";
import { compareEventsByStart } from "@/widgets/calendar/lib/agenda";
import type { CalendarEvent, CalendarEventsResult } from "@/widgets/calendar/types";

export const MAX_EVENT_PAGES = 10;

export type CalendarPageResult = { events: CalendarEvent[]; limited: boolean };

export function prioritizedWindows(
  timeMin: Date,
  timeMax: Date,
  priorityAt?: Date,
): { timeMin: Date; timeMax: Date }[] {
  if (!priorityAt || priorityAt <= timeMin || priorityAt >= timeMax) return [{ timeMin, timeMax }];
  return [
    { timeMin: priorityAt, timeMax },
    { timeMin, timeMax: priorityAt },
  ];
}

export function toIsoString(date: Date): string | null {
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function parseAllDayDate(value: string): string | null {
  const datePart = value.split("T")[0] ?? value;
  const [year = 0, month = 1, day = 1] = datePart.split("-").map(Number);
  return toIsoString(new Date(year, month - 1, day));
}

export function parseCalendarItems<T>(schema: ZodType<T>, items: readonly unknown[]): T[] {
  return items.flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export async function fanOutCalendars(
  calendarIds: readonly string[],
  fetchOne: (calendarId: string) => Promise<CalendarPageResult>,
): Promise<CalendarEventsResult> {
  const results = await Promise.allSettled(calendarIds.map((calendarId) => fetchOne(calendarId)));

  const events = results
    .flatMap((result) => (result.status === "fulfilled" ? result.value.events : []))
    .sort(compareEventsByStart);

  const failedCalendarIds = results.flatMap((result, index) => {
    const calendarId = calendarIds[index];
    return result.status === "rejected" && calendarId ? [calendarId] : [];
  });

  const limitedCalendarIds = calendarIds.filter((_, index) => {
    const result = results[index];
    return result?.status === "fulfilled" && result.value.limited;
  });
  return {
    events,
    failedCalendarIds,
    ...(limitedCalendarIds.length > 0 ? { limitedCalendarIds } : {}),
  };
}
