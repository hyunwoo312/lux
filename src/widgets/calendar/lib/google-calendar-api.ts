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

const API_BASE_URL = "https://www.googleapis.com/calendar/v3";
const MAX_EVENT_PAGES = 10;

const googleCalendarListEntrySchema = z.object({
  id: z.string().optional(),
  summary: z.string().optional(),
  backgroundColor: z.string().optional(),
  primary: z.boolean().optional(),
});
type GoogleCalendarListEntry = z.infer<typeof googleCalendarListEntrySchema>;

const googleDateTimeSchema = z.object({
  date: z.string().optional(),
  dateTime: z.string().optional(),
});
type GoogleCalendarDateTime = z.infer<typeof googleDateTimeSchema>;

const googleEventSchema = z.object({
  id: z.string().optional(),
  summary: z.string().optional(),
  start: googleDateTimeSchema.optional(),
  end: googleDateTimeSchema.optional(),
  location: z.string().optional(),
  status: z.string().optional(),
  htmlLink: z.string().optional(),
  hangoutLink: z.string().optional(),
  conferenceData: z
    .object({
      entryPoints: z
        .array(z.object({ entryPointType: z.string().optional(), uri: z.string().optional() }))
        .optional(),
    })
    .optional(),
  attendees: z
    .array(z.object({ self: z.boolean().optional(), responseStatus: z.string().optional() }))
    .optional(),
});
type GoogleCalendarEvent = z.infer<typeof googleEventSchema>;

const googleEventsEnvelope = z.object({
  items: z.array(z.unknown()).optional(),
  nextPageToken: z.string().optional(),
});

const googleCalendarsEnvelope = z.object({
  items: z.array(z.unknown()).optional(),
});

const GOOGLE_RSVP: Record<string, RsvpStatus> = {
  accepted: "accepted",
  declined: "declined",
  tentative: "tentative",
  needsAction: "needsAction",
};

function googleJoinUrl(event: GoogleCalendarEvent): string | undefined {
  if (event.hangoutLink) return event.hangoutLink;
  return event.conferenceData?.entryPoints?.find(
    (entry) => entry.entryPointType === "video" && entry.uri,
  )?.uri;
}

function googleRsvp(event: GoogleCalendarEvent): RsvpStatus | undefined {
  const self = event.attendees?.find((attendee) => attendee.self);
  return self?.responseStatus ? GOOGLE_RSVP[self.responseStatus] : undefined;
}

function toIsoString(date: Date): string | null {
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseAllDayDate(value: string): string | null {
  const [year = 0, month = 1, day = 1] = value.split("-").map(Number);
  return toIsoString(new Date(year, month - 1, day));
}

function normalizeDateTime(value: GoogleCalendarDateTime | undefined): string | null {
  if (value?.dateTime) return toIsoString(new Date(value.dateTime));
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
    joinUrl: googleJoinUrl(event),
    rsvp: googleRsvp(event),
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
  const events: CalendarEvent[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_EVENT_PAGES; page += 1) {
    const url = buildGoogleEventsUrl(calendarId, timeMin, timeMax);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await integrationFetch("google", url);

    ensureOk(response, `Google calendar events request failed for ${calendarId}`);

    const payload = parseResponse(
      "Google calendar events",
      googleEventsEnvelope,
      await response.json(),
    );

    events.push(
      ...parseCalendarItems(googleEventSchema, payload.items ?? [])
        .map((event) => normalizeGoogleEvent(event, calendarId))
        .filter((event): event is CalendarEvent => Boolean(event)),
    );

    if (events.length >= MAX_CALENDAR_EVENTS) break;
    pageToken = payload.nextPageToken;
    if (!pageToken) break;
  }

  return events;
}

export async function fetchGoogleCalendars(
  selectedCalendarIds: readonly string[] = [],
): Promise<ConnectedCalendar[]> {
  const response = await integrationFetch("google", `${API_BASE_URL}/users/me/calendarList`);

  ensureOk(response, "Google calendar list request failed");

  const payload = parseResponse(
    "Google calendar list",
    googleCalendarsEnvelope,
    await response.json(),
  );

  return parseCalendarItems(googleCalendarListEntrySchema, payload.items ?? [])
    .map((calendar) => normalizeGoogleCalendar(calendar, selectedCalendarIds))
    .filter((calendar): calendar is ConnectedCalendar => Boolean(calendar));
}

export async function fetchGoogleCalendarEvents({
  calendarIds,
  timeMin,
  timeMax,
}: CalendarEventWindow): Promise<CalendarEventsResult> {
  return fanOutCalendars(calendarIds, (calendarId) =>
    fetchEventsForCalendar(calendarId, timeMin, timeMax),
  );
}
