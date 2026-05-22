import { z } from "zod";

export const MIN_LOOKAHEAD_DAYS = 1;
export const MAX_LOOKAHEAD_DAYS = 30;
export const MAX_CALENDAR_EVENTS = 500;

export type CalendarSyncStatus = "idle" | "syncing" | "error";

export const CALENDAR_VIEWS = ["calendar", "list"] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export type CalendarMode = "month" | "week";

export const CALENDAR_PROVIDER_IDS = ["google", "microsoft"] as const;
export type CalendarProviderId = (typeof CALENDAR_PROVIDER_IDS)[number];

export type CalendarEventLink = {
  provider: CalendarProviderId;
  sourceUrl?: string;
};

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
