import { integrationFetch } from "@/integrations";
import { compareEventsByStart } from "@/widgets/calendar/lib/agenda";
import type { CalendarEvent, ConnectedCalendar } from "@/widgets/calendar/types";

const API_BASE_URL = "https://www.googleapis.com/calendar/v3";

type GoogleCalendarListEntry = {
  id?: string;
  summary?: string;
  backgroundColor?: string;
  primary?: boolean;
};

type GoogleCalendarDateTime = {
  date?: string;
  dateTime?: string;
};

type GoogleCalendarEvent = {
  id?: string;
  summary?: string;
  start?: GoogleCalendarDateTime;
  end?: GoogleCalendarDateTime;
  location?: string;
  status?: "confirmed" | "tentative" | "cancelled";
  htmlLink?: string;
};

type GoogleCalendarEventWindow = {
  calendarIds: string[];
  timeMin: Date;
  timeMax: Date;
};

type GoogleCalendarEventsResult = {
  events: CalendarEvent[];
  failedCalendarIds: string[];
};

function parseAllDayDate(value: string): string {
  const [year = 0, month = 1, day = 1] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toISOString();
}

function normalizeDateTime(value: GoogleCalendarDateTime | undefined): string | null {
  if (value?.dateTime) return new Date(value.dateTime).toISOString();
  if (value?.date) return parseAllDayDate(value.date);
  return null;
}

export function normalizeGoogleCalendar(
  calendar: GoogleCalendarListEntry,
  selectedCalendarIds: readonly string[] = [],
): ConnectedCalendar | null {
  if (!calendar.id || !calendar.summary) return null;

  const selected =
    selectedCalendarIds.length > 0
      ? selectedCalendarIds.includes(calendar.id)
      : Boolean(calendar.primary);

  return {
    id: calendar.id,
    summary: calendar.summary,
    backgroundColor: calendar.backgroundColor,
    primary: Boolean(calendar.primary),
    selected,
  };
}

export function normalizeGoogleEvent(
  event: GoogleCalendarEvent,
  calendarId: string,
): CalendarEvent | null {
  if (!event.id || event.status === "cancelled") return null;

  const startsAt = normalizeDateTime(event.start);
  const endsAt = normalizeDateTime(event.end);

  if (!startsAt || !endsAt) return null;

  return {
    id: `google-${calendarId}-${event.id}`,
    calendarId,
    provider: "google",
    title: event.summary || "Busy",
    startsAt,
    endsAt,
    location: event.location,
    sourceUrl: event.htmlLink,
    isAllDay: Boolean(event.start?.date),
    visibility: event.summary ? "default" : "busy",
  };
}

export function buildGoogleEventsUrl(calendarId: string, timeMin: Date, timeMax: Date): URL {
  const url = new URL(`${API_BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeMin", timeMin.toISOString());
  url.searchParams.set("timeMax", timeMax.toISOString());
  url.searchParams.set("maxResults", "2500");
  return url;
}

async function fetchEventsForCalendar(
  calendarId: string,
  timeMin: Date,
  timeMax: Date,
): Promise<CalendarEvent[]> {
  const response = await integrationFetch("google", buildGoogleEventsUrl(calendarId, timeMin, timeMax));

  if (!response.ok) {
    throw new Error(`Google calendar events request failed for ${calendarId}`);
  }

  const payload = (await response.json()) as { items?: GoogleCalendarEvent[] };

  return (payload.items ?? [])
    .map((event) => normalizeGoogleEvent(event, calendarId))
    .filter((event): event is CalendarEvent => Boolean(event));
}

export async function fetchGoogleCalendars(
  selectedCalendarIds: readonly string[] = [],
): Promise<ConnectedCalendar[]> {
  const response = await integrationFetch("google", `${API_BASE_URL}/users/me/calendarList`);

  if (!response.ok) {
    throw new Error("Google calendar list request failed");
  }

  const payload = (await response.json()) as { items?: GoogleCalendarListEntry[] };

  return (payload.items ?? [])
    .map((calendar) => normalizeGoogleCalendar(calendar, selectedCalendarIds))
    .filter((calendar): calendar is ConnectedCalendar => Boolean(calendar));
}

export async function fetchGoogleCalendarEvents({
  calendarIds,
  timeMin,
  timeMax,
}: GoogleCalendarEventWindow): Promise<GoogleCalendarEventsResult> {
  const results = await Promise.allSettled(
    calendarIds.map((calendarId) => fetchEventsForCalendar(calendarId, timeMin, timeMax)),
  );

  const events = results
    .filter((result): result is PromiseFulfilledResult<CalendarEvent[]> => result.status === "fulfilled")
    .flatMap((result) => result.value)
    .sort(compareEventsByStart);

  const failedCalendarIds = results.flatMap((result, index) => {
    const calendarId = calendarIds[index];
    return result.status === "rejected" && calendarId ? [calendarId] : [];
  });

  return { events, failedCalendarIds };
}
