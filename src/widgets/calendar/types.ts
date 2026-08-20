import type { AccentPreset } from "@/widgets/core/accent";

export const CALENDAR_ACCENT: AccentPreset = "orange";

import { z } from "zod";

export const MIN_LOOKAHEAD_DAYS = 1;
export const MAX_LOOKAHEAD_DAYS = 30;
export const MAX_CALENDAR_EVENTS = 500;

export type CalendarSyncStatus = "idle" | "syncing" | "error";

export const CALENDAR_VIEWS = ["calendar", "list"] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export type CalendarMode = "month" | "week";

const CALENDAR_PROVIDER_IDS = ["google", "microsoft"] as const;
export type CalendarProviderId = (typeof CALENDAR_PROVIDER_IDS)[number];

export type CalendarEventLink = {
  provider: CalendarProviderId;
  sourceUrl?: string;
};

const RSVP_STATUSES = ["accepted", "declined", "tentative", "needsAction"] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];

export const calendarEventSchema = z.object({
  id: z.string().min(1),
  calendarId: z.string().min(1),
  provider: z.enum(CALENDAR_PROVIDER_IDS).optional(),
  title: z.string().min(1).max(200),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  location: z.string().max(200).optional(),
  sourceUrl: z.string().optional(),
  isAllDay: z.boolean(),
  visibility: z.enum(["default", "busy"]),
  joinUrl: z.string().optional(),
  rsvp: z.enum(RSVP_STATUSES).optional(),
});
export type CalendarEvent = z.infer<typeof calendarEventSchema>;

export type DisplayCalendarEvent = CalendarEvent & { links: CalendarEventLink[] };

export const connectedCalendarSchema = z.object({
  id: z.string().min(1),
  summary: z.string().min(1).max(200),
  backgroundColor: z.string().max(32).optional(),
  primary: z.boolean().default(false),
  selected: z.boolean().default(false),
});
export type ConnectedCalendar = z.infer<typeof connectedCalendarSchema>;
