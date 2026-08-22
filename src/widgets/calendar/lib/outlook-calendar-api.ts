import { z } from "zod";
import { integrationFetch } from "@/integrations";
import { ensureOk, parseResponse } from "@/lib/net";
import { fanOutCalendars, parseCalendarItems } from "@/widgets/calendar/lib/provider-fetch";
import {
  MAX_CALENDAR_EVENTS,
  type CalendarEvent,
  type CalendarEventsResult,
  type CalendarEventWindow,
  type ConnectedCalendar,
  type RsvpStatus,
} from "@/widgets/calendar/types";

const API_BASE_URL = "https://graph.microsoft.com/v1.0";
const MAX_EVENT_PAGES = 10;

const graphCalendarSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  color: z.string().optional(),
  hexColor: z.string().optional(),
  isDefaultCalendar: z.boolean().optional(),
});
type GraphCalendar = z.infer<typeof graphCalendarSchema>;

const graphDateTimeSchema = z.object({
  dateTime: z.string().optional(),
  timeZone: z.string().optional(),
});
type GraphDateTime = z.infer<typeof graphDateTimeSchema>;

const graphEventSchema = z.object({
  id: z.string().optional(),
  subject: z.string().optional(),
  start: graphDateTimeSchema.optional(),
  end: graphDateTimeSchema.optional(),
  isAllDay: z.boolean().optional(),
  isCancelled: z.boolean().optional(),
  location: z.object({ displayName: z.string().optional() }).optional(),
  webLink: z.string().optional(),
  onlineMeeting: z.object({ joinUrl: z.string().optional() }).nullish(),
  onlineMeetingUrl: z.string().nullish(),
  responseStatus: z.object({ response: z.string().optional() }).optional(),
});
type GraphEvent = z.infer<typeof graphEventSchema>;

const outlookEventsEnvelope = z.object({
  value: z.array(z.unknown()).optional(),
  "@odata.nextLink": z.string().optional(),
});

const outlookCalendarsEnvelope = z.object({
  value: z.array(z.unknown()).optional(),
});

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

const GRAPH_RSVP: Record<string, RsvpStatus> = {
  accepted: "accepted",
  organizer: "accepted",
  declined: "declined",
  tentativelyAccepted: "tentative",
  notResponded: "needsAction",
};

function outlookJoinUrl(event: GraphEvent): string | undefined {
  return event.onlineMeeting?.joinUrl ?? event.onlineMeetingUrl ?? undefined;
}

function outlookRsvp(event: GraphEvent): RsvpStatus | undefined {
  const response = event.responseStatus?.response;
  return response ? GRAPH_RSVP[response] : undefined;
}

function toIsoString(date: Date): string | null {
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseAllDayDate(value: string): string | null {
  const datePart = value.split("T")[0] ?? value;
  const [year = 0, month = 1, day = 1] = datePart.split("-").map(Number);
  return toIsoString(new Date(year, month - 1, day));
}

function normalizeDateTime(value: GraphDateTime | undefined, isAllDay: boolean): string | null {
  if (!value?.dateTime) return null;
  if (isAllDay) return parseAllDayDate(value.dateTime);
  const utc = value.dateTime.endsWith("Z") ? value.dateTime : `${value.dateTime}Z`;
  return toIsoString(new Date(utc));
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

export function normalizeOutlookEvent(event: GraphEvent, calendarId: string): CalendarEvent | null {
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
    joinUrl: outlookJoinUrl(event),
    rsvp: outlookRsvp(event),
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
  const events: CalendarEvent[] = [];
  let nextUrl: string | URL | null = buildOutlookEventsUrl(calendarId, timeMin, timeMax);

  for (let page = 0; page < MAX_EVENT_PAGES && nextUrl; page += 1) {
    const response = await integrationFetch("microsoft", nextUrl, {
      headers: { Prefer: 'outlook.timezone="UTC"' },
    });

    ensureOk(response, `Outlook calendar events request failed for ${calendarId}`);

    const payload = parseResponse(
      "Outlook calendar events",
      outlookEventsEnvelope,
      await response.json(),
    );

    events.push(
      ...parseCalendarItems(graphEventSchema, payload.value ?? [])
        .map((event) => normalizeOutlookEvent(event, calendarId))
        .filter((event): event is CalendarEvent => Boolean(event)),
    );

    if (events.length >= MAX_CALENDAR_EVENTS) break;
    nextUrl = payload["@odata.nextLink"] ?? null;
  }

  return events;
}

export async function fetchOutlookCalendars(
  selectedCalendarIds: readonly string[] = [],
): Promise<ConnectedCalendar[]> {
  const response = await integrationFetch("microsoft", `${API_BASE_URL}/me/calendars`);

  ensureOk(response, "Outlook calendar list request failed");

  const payload = parseResponse(
    "Outlook calendar list",
    outlookCalendarsEnvelope,
    await response.json(),
  );

  return parseCalendarItems(graphCalendarSchema, payload.value ?? [])
    .map((calendar) => normalizeOutlookCalendar(calendar, selectedCalendarIds))
    .filter((calendar): calendar is ConnectedCalendar => Boolean(calendar));
}

export async function fetchOutlookCalendarEvents({
  calendarIds,
  timeMin,
  timeMax,
}: CalendarEventWindow): Promise<CalendarEventsResult> {
  return fanOutCalendars(calendarIds, (calendarId) =>
    fetchEventsForCalendar(calendarId, timeMin, timeMax),
  );
}
