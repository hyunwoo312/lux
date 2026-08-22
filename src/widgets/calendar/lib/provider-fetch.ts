import type { ZodType } from "zod";
import { compareEventsByStart } from "@/widgets/calendar/lib/agenda";
import type { CalendarEvent, CalendarEventsResult } from "@/widgets/calendar/types";

export function parseCalendarItems<T>(schema: ZodType<T>, items: readonly unknown[]): T[] {
  return items.flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export async function fanOutCalendars(
  calendarIds: readonly string[],
  fetchOne: (calendarId: string) => Promise<CalendarEvent[]>,
): Promise<CalendarEventsResult> {
  const results = await Promise.allSettled(calendarIds.map((calendarId) => fetchOne(calendarId)));

  const events = results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .sort(compareEventsByStart);

  const failedCalendarIds = results.flatMap((result, index) => {
    const calendarId = calendarIds[index];
    return result.status === "rejected" && calendarId ? [calendarId] : [];
  });

  return { events, failedCalendarIds };
}
