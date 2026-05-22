import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIntegrationStore } from "@/integrations";
import {
  fetchGoogleCalendarEvents,
  fetchGoogleCalendars,
} from "@/widgets/calendar/lib/google-calendar-api";
import { useCalendarStore } from "@/widgets/calendar/useCalendarStore";
import type { CalendarEvent, ConnectedCalendar } from "@/widgets/calendar/types";

vi.mock("@/widgets/calendar/lib/google-calendar-api", () => ({
  fetchGoogleCalendars: vi.fn(),
  fetchGoogleCalendarEvents: vi.fn(),
}));

const fetchCalendarsMock = vi.mocked(fetchGoogleCalendars);
const fetchEventsMock = vi.mocked(fetchGoogleCalendarEvents);

const EMPTY_PROVIDER = { calendars: [], enabledCalendarIds: [], failedCalendarIds: [] };

function createCalendar(overrides: Partial<ConnectedCalendar> = {}): ConnectedCalendar {
  return {
    id: overrides.id ?? "primary",
    summary: overrides.summary ?? "Primary",
    primary: overrides.primary ?? true,
    selected: overrides.selected ?? false,
  };
}

function createEvent(): CalendarEvent {
  return {
    id: "google-primary-evt",
    calendarId: "primary",
    title: "Standup",
    startsAt: "2026-06-20T09:00:00.000Z",
    endsAt: "2026-06-20T09:30:00.000Z",
    isAllDay: false,
    visibility: "default",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useIntegrationStore.setState({
    loaded: true,
    accounts: [
      {
        id: "google-1",
        providerId: "google",
        providerAccountId: "1",
        displayName: "Test",
        status: "connected",
        connectedAt: "2026-06-20T00:00:00.000Z",
      },
    ],
  });
  useCalendarStore.setState({
    events: [],
    lookaheadDays: 7,
    enabled: true,
    google: { ...EMPTY_PROVIDER },
    microsoft: { ...EMPTY_PROVIDER },
    status: "idle",
    syncing: [],
  });
});

describe("useCalendarStore.sync", () => {
  it("loads calendars and events and records a successful sync", async () => {
    fetchCalendarsMock.mockResolvedValue([createCalendar()]);
    fetchEventsMock.mockResolvedValue({ events: [createEvent()], failedCalendarIds: [] });

    await useCalendarStore.getState().sync();

    const state = useCalendarStore.getState();
    expect(state.status).toBe("idle");
    expect(state.events).toHaveLength(1);
    expect(state.google.enabledCalendarIds).toEqual(["primary"]);
    expect(state.google.calendars[0]?.selected).toBe(true);
    expect(state.google.lastSyncedAt).toBeDefined();
  });

  it("records an error status when a calendar fails", async () => {
    fetchCalendarsMock.mockResolvedValue([createCalendar()]);
    fetchEventsMock.mockResolvedValue({ events: [], failedCalendarIds: ["primary"] });

    await useCalendarStore.getState().sync();

    expect(useCalendarStore.getState().status).toBe("error");
    expect(useCalendarStore.getState().google.lastError).toBeDefined();
  });

  it("captures a thrown sync failure as error state", async () => {
    fetchCalendarsMock.mockRejectedValue(new Error("Google Calendar is not connected"));

    await useCalendarStore.getState().sync();

    const state = useCalendarStore.getState();
    expect(state.status).toBe("error");
    expect(state.google.lastError).toBe("Google Calendar is not connected");
  });

  it("skips syncing while cooling down unless bypassed", async () => {
    useCalendarStore.setState({
      google: { ...EMPTY_PROVIDER, lastSyncedAt: new Date().toISOString() },
    });

    await useCalendarStore.getState().sync();
    expect(fetchCalendarsMock).not.toHaveBeenCalled();

    fetchCalendarsMock.mockResolvedValue([createCalendar()]);
    fetchEventsMock.mockResolvedValue({ events: [], failedCalendarIds: [] });
    await useCalendarStore.getState().sync({ bypassCooldown: true });
    expect(fetchCalendarsMock).toHaveBeenCalledTimes(1);
  });
});

describe("useCalendarStore selection + clear", () => {
  it("toggles calendar selection", () => {
    useCalendarStore.setState({
      google: {
        calendars: [createCalendar({ id: "a", selected: false })],
        enabledCalendarIds: [],
        failedCalendarIds: ["a"],
      },
    });

    useCalendarStore.getState().setCalendarSelection("google", "a", true);

    const { google } = useCalendarStore.getState();
    expect(google.enabledCalendarIds).toEqual(["a"]);
    expect(google.calendars[0]?.selected).toBe(true);
    expect(google.failedCalendarIds).toEqual([]);
  });

  it("clears events and settings on disconnect", () => {
    useCalendarStore.setState({
      events: [createEvent()],
      google: { calendars: [createCalendar()], enabledCalendarIds: ["primary"], failedCalendarIds: [] },
    });

    useCalendarStore.getState().clearIntegration("google");

    const state = useCalendarStore.getState();
    expect(state.events).toEqual([]);
    expect(state.google.enabledCalendarIds).toEqual([]);
    expect(state.google.calendars).toEqual([]);
  });
});
