import { integrationFetch } from "@/integrations";
import { compareEventsByStart } from "@/widgets/calendar/lib/agenda";
import type { CalendarEvent, ConnectedCalendar } from "@/widgets/calendar/types";

const API_BASE_URL = "https://graph.microsoft.com/v1.0";

type GraphCalendar = {
  id?: string;
  name?: string;
  color?: string;
  hexColor?: string;
  isDefaultCalendar?: boolean;
};

const NAMED_COLOR_HEX: Record<string, string> = {
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

function resolveCalendarColor(calendar: GraphCalendar): string | undefined {
  if (calendar.hexColor && /^#[0-9a-f]{6}$/i.test(calendar.hexColor)) return calendar.hexColor;
  return calendar.color ? NAMED_COLOR_HEX[calendar.color] : undefined;
}

type GraphDateTime = {
  dateTime?: string;
  timeZone?: string;
};

type GraphEvent = {
  id?: string;
  subject?: string;
  start?: GraphDateTime;
  end?: GraphDateTime;
  isAllDay?: boolean;
  isCancelled?: boolean;
  location?: { displayName?: string };
  webLink?: string;
};

type OutlookEventWindow = {
  calendarIds: string[];
  timeMin: Date;
  timeMax: Date;
};

type OutlookEventsResult = {
  events: CalendarEvent[];
  failedCalendarIds: string[];
};

function parseAllDayDate(value: string): string {
  const datePart = value.split("T")[0] ?? value;
  const [year = 0, month = 1, day = 1] = datePart.split("-").map(Number);
  return new Date(year, month - 1, day).toISOString();
}

function normalizeDateTime(value: GraphDateTime | undefined, isAllDay: boolean): string | null {
  if (!value?.dateTime) return null;
  if (isAllDay) return parseAllDayDate(value.dateTime);
  const utc = value.dateTime.endsWith("Z") ? value.dateTime : `${value.dateTime}Z`;
  const parsed = new Date(utc);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function normalizeOutlookCalendar(
  calendar: GraphCalendar,
  selectedCalendarIds: readonly string[] = [],
): ConnectedCalendar | null {
  if (!calendar.id || !calendar.name) return null;

  const selected =
    selectedCalendarIds.length > 0
      ? selectedCalendarIds.includes(calendar.id)
      : Boolean(calendar.isDefaultCalendar);

  return {
    id: calendar.id,
    summary: calendar.name,
    backgroundColor: resolveCalendarColor(calendar),
    primary: Boolean(calendar.isDefaultCalendar),
    selected,
  };
}

export function normalizeOutlookEvent(
  event: GraphEvent,
  calendarId: string,
): CalendarEvent | null {
  if (!event.id || event.isCancelled) return null;

  const isAllDay = Boolean(event.isAllDay);
  const startsAt = normalizeDateTime(event.start, isAllDay);
  const endsAt = normalizeDateTime(event.end, isAllDay);

  if (!startsAt || !endsAt) return null;

  return {
    id: `microsoft-${calendarId}-${event.id}`,
    calendarId,
    provider: "microsoft",
    title: event.subject || "Busy",
    startsAt,
    endsAt,
    location: event.location?.displayName,
    sourceUrl: event.webLink,
    isAllDay,
    visibility: event.subject ? "default" : "busy",
  };
}

function buildOutlookEventsUrl(calendarId: string, timeMin: Date, timeMax: Date): URL {
  const url = new URL(
    `${API_BASE_URL}/me/calendars/${encodeURIComponent(calendarId)}/calendarView`,
  );
  url.searchParams.set("startDateTime", timeMin.toISOString());
  url.searchParams.set("endDateTime", timeMax.toISOString());
  url.searchParams.set("$top", "250");
  url.searchParams.set("$orderby", "start/dateTime");
  return url;
}

async function fetchEventsForCalendar(
  calendarId: string,
  timeMin: Date,
  timeMax: Date,
): Promise<CalendarEvent[]> {
  const response = await integrationFetch(
    "microsoft",
    buildOutlookEventsUrl(calendarId, timeMin, timeMax),
    { headers: { Prefer: 'outlook.timezone="UTC"' } },
  );

  if (!response.ok) {
    throw new Error(`Outlook calendar events request failed for ${calendarId}`);
  }

  const payload = (await response.json()) as { value?: GraphEvent[] };

  return (payload.value ?? [])
    .map((event) => normalizeOutlookEvent(event, calendarId))
    .filter((event): event is CalendarEvent => Boolean(event));
}

export async function fetchOutlookCalendars(
  selectedCalendarIds: readonly string[] = [],
): Promise<ConnectedCalendar[]> {
  const response = await integrationFetch("microsoft", `${API_BASE_URL}/me/calendars`);

  if (!response.ok) {
    throw new Error("Outlook calendar list request failed");
  }

  const payload = (await response.json()) as { value?: GraphCalendar[] };

  return (payload.value ?? [])
    .map((calendar) => normalizeOutlookCalendar(calendar, selectedCalendarIds))
    .filter((calendar): calendar is ConnectedCalendar => Boolean(calendar));
}

export async function fetchOutlookCalendarEvents({
  calendarIds,
  timeMin,
  timeMax,
}: OutlookEventWindow): Promise<OutlookEventsResult> {
  const results = await Promise.allSettled(
    calendarIds.map((calendarId) => fetchEventsForCalendar(calendarId, timeMin, timeMax)),
  );

  const events = results
    .filter(
      (result): result is PromiseFulfilledResult<CalendarEvent[]> => result.status === "fulfilled",
    )
    .flatMap((result) => result.value)
    .sort(compareEventsByStart);

  const failedCalendarIds = results.flatMap((result, index) => {
    const calendarId = calendarIds[index];
    return result.status === "rejected" && calendarId ? [calendarId] : [];
  });

  return { events, failedCalendarIds };
}
