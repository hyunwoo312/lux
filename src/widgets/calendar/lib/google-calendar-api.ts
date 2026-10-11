import { z } from "zod";
import { integrationFetch } from "@/integrations";
import { ensureOk, readJson } from "@/lib/net";
import {
  fanOutCalendars,
  MAX_EVENT_PAGES,
  parseAllDayDate,
  parseCalendarItems,
  toIsoString,
  prioritizedWindows,
  type CalendarPageResult,
} from "@/widgets/calendar/lib/provider-fetch";
import {
  MAX_CALENDAR_EVENTS,
  type CalendarEvent,
  type CalendarEventsResult,
  type CalendarEventWindow,
  type ConnectedCalendar,
  type RsvpStatus,
} from "@/widgets/calendar/types";

const API_BASE_URL = "https://www.googleapis.com/calendar/v3";

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
  nextPageToken: z.string().optional(),
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

function normalizeDateTime(value: GoogleCalendarDateTime | undefined): string | null {
  if (value?.dateTime) return toIsoString(new Date(value.dateTime));
  if (value?.date) return parseAllDayDate(value.date);
  return null;
}

export function normalizeGoogleCalendar(
  calendar: GoogleCalendarListEntry,
): ConnectedCalendar | null {
  if (!calendar.id || !calendar.summary) return null;

  return {
    id: calendar.id,
    summary: calendar.summary,
    backgroundColor: calendar.backgroundColor,
    primary: Boolean(calendar.primary),
    selected: false,
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
  priorityAt?: Date,
): Promise<CalendarPageResult> {
  const events: CalendarEvent[] = [];
  const windows = prioritizedWindows(timeMin, timeMax, priorityAt);
  let limited = false;
  for (const [index, window] of windows.entries()) {
    let pageToken: string | undefined;

    for (let page = 0; page < MAX_EVENT_PAGES; page += 1) {
      const url = buildGoogleEventsUrl(calendarId, window.timeMin, window.timeMax);
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const response = await integrationFetch("google", url);

      ensureOk(response, `Google calendar events request failed for ${calendarId}`);

      const payload = await readJson(response, "Google calendar events", googleEventsEnvelope);

      events.push(
        ...parseCalendarItems(googleEventSchema, payload.items ?? [])
          .map((event) => normalizeGoogleEvent(event, calendarId))
          .filter((event): event is CalendarEvent => Boolean(event)),
      );

      pageToken = payload.nextPageToken;
      if (events.length >= MAX_CALENDAR_EVENTS) {
        limited =
          events.length > MAX_CALENDAR_EVENTS || Boolean(pageToken) || index < windows.length - 1;
        break;
      }
      if (!pageToken) break;
    }
    limited ||= Boolean(pageToken);
    if (events.length >= MAX_CALENDAR_EVENTS) break;
  }

  return {
    events: [...new Map(events.map((event) => [event.id, event])).values()].slice(
      0,
      MAX_CALENDAR_EVENTS,
    ),
    limited,
  };
}

export async function fetchGoogleCalendars(): Promise<ConnectedCalendar[]> {
  const calendars: ConnectedCalendar[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_EVENT_PAGES; page += 1) {
    const url = new URL(`${API_BASE_URL}/users/me/calendarList`);
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await integrationFetch("google", url);

    ensureOk(response, "Google calendar list request failed");

    const payload = await readJson(response, "Google calendar list", googleCalendarsEnvelope);

    calendars.push(
      ...parseCalendarItems(googleCalendarListEntrySchema, payload.items ?? [])
        .map((calendar) => normalizeGoogleCalendar(calendar))
        .filter((calendar): calendar is ConnectedCalendar => Boolean(calendar)),
    );
    pageToken = payload.nextPageToken;
    if (!pageToken) return calendars;
  }
  throw new Error("Google calendar list is incomplete");
}

export async function fetchGoogleCalendarEvents({
  calendarIds,
  timeMin,
  timeMax,
  priorityAt,
}: CalendarEventWindow): Promise<CalendarEventsResult> {
  return fanOutCalendars(calendarIds, (calendarId) =>
    fetchEventsForCalendar(calendarId, timeMin, timeMax, priorityAt),
  );
}
