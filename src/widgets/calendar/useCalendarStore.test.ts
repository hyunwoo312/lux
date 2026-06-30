import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIntegrationStore } from "@/integrations";
import {
  fetchGoogleCalendarEvents,
  fetchGoogleCalendars,
} from "@/widgets/calendar/lib/google-calendar-api";
import { useCalendarStore, type CalendarData } from "@/widgets/calendar/useCalendarStore";
import type { CalendarEvent, ConnectedCalendar } from "@/widgets/calendar/types";

vi.mock("@/widgets/calendar/lib/google-calendar-api", () => ({
  fetchGoogleCalendars: vi.fn(),
  fetchGoogleCalendarEvents: vi.fn(),
}));

const fetchCalendarsMock = vi.mocked(fetchGoogleCalendars);
const fetchEventsMock = vi.mocked(fetchGoogleCalendarEvents);

const ID = "calendar-1";

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

function baseData(over: Partial<CalendarData> = {}): CalendarData {
  const now = new Date();
  return {
    events: [],
    lookaheadDays: 7,
    enabled: true,
    view: "calendar",
    google: { calendars: [], enabledCalendarIds: [], failedCalendarIds: [] },
    microsoft: { calendars: [], enabledCalendarIds: [], failedCalendarIds: [] },
    primarySource: "google",
    refreshIntervalHours: 6,
    status: "idle",
    syncing: [],
    visibleMonth: new Date(now.getFullYear(), now.getMonth(), 1),
    mode: "month",
    selectedDay: null,
    focusRowIndex: 0,
    listAnchor: now,
    ...over,
  };
}

function seed(over: Partial<CalendarData> = {}) {
  useCalendarStore.setState({ byInstance: { [ID]: baseData(over) } });
}

const data = () => useCalendarStore.getState().byInstance[ID];

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
  seed();
});

describe("useCalendarStore.sync", () => {
  it("loads calendars and events and records a successful sync", async () => {
    fetchCalendarsMock.mockResolvedValue([createCalendar()]);
    fetchEventsMock.mockResolvedValue({ events: [createEvent()], failedCalendarIds: [] });

    await useCalendarStore.getState().sync(ID);

    const d = data();
    expect(d?.status).toBe("idle");
    expect(d?.events).toHaveLength(1);
    expect(d?.google.enabledCalendarIds).toEqual(["primary"]);
    expect(d?.google.calendars[0]?.selected).toBe(true);
    expect(d?.google.lastSyncedAt).toBeDefined();
  });

  it("records an error status when a calendar fails", async () => {
    fetchCalendarsMock.mockResolvedValue([createCalendar()]);
    fetchEventsMock.mockResolvedValue({ events: [], failedCalendarIds: ["primary"] });

    await useCalendarStore.getState().sync(ID);

    expect(data()?.status).toBe("error");
    expect(data()?.google.lastError).toBeDefined();
  });

  it("captures a thrown sync failure as error state", async () => {
    fetchCalendarsMock.mockRejectedValue(new Error("Google Calendar is not connected"));

    await useCalendarStore.getState().sync(ID);

    const d = data();
    expect(d?.status).toBe("error");
    expect(d?.google.lastError).toBe("Google Calendar is not connected");
  });

  it("skips syncing while cooling down unless bypassed", async () => {
    seed({
      google: {
        calendars: [],
        enabledCalendarIds: [],
        failedCalendarIds: [],
        lastSyncedAt: new Date().toISOString(),
      },
    });

    await useCalendarStore.getState().sync(ID);
    expect(fetchCalendarsMock).not.toHaveBeenCalled();

    fetchCalendarsMock.mockResolvedValue([createCalendar()]);
    fetchEventsMock.mockResolvedValue({ events: [], failedCalendarIds: [] });
    await useCalendarStore.getState().sync(ID, { bypassCooldown: true });
    expect(fetchCalendarsMock).toHaveBeenCalledTimes(1);
  });

  it("keeps instances independent when syncing", async () => {
    seed();
    useCalendarStore.setState((state) => ({
      byInstance: { ...state.byInstance, other: baseData() },
    }));
    fetchCalendarsMock.mockResolvedValue([createCalendar()]);
    fetchEventsMock.mockResolvedValue({ events: [createEvent()], failedCalendarIds: [] });

    await useCalendarStore.getState().sync(ID);

    expect(data()?.events).toHaveLength(1);
    expect(useCalendarStore.getState().byInstance["other"]?.events).toEqual([]);
  });
});

describe("useCalendarStore selection + clear", () => {
  it("toggles calendar selection", () => {
    seed({
      google: {
        calendars: [createCalendar({ id: "a", selected: false })],
        enabledCalendarIds: [],
        failedCalendarIds: ["a"],
      },
    });

    useCalendarStore.getState().setCalendarSelection(ID, "google", "a", true);

    const google = data()?.google;
    expect(google?.enabledCalendarIds).toEqual(["a"]);
    expect(google?.calendars[0]?.selected).toBe(true);
    expect(google?.failedCalendarIds).toEqual([]);
  });

  it("clears events and settings on disconnect", () => {
    seed({
      events: [createEvent()],
      google: {
        calendars: [createCalendar()],
        enabledCalendarIds: ["primary"],
        failedCalendarIds: [],
      },
    });

    useCalendarStore.getState().clearIntegration(ID, "google");

    const d = data();
    expect(d?.events).toEqual([]);
    expect(d?.google.enabledCalendarIds).toEqual([]);
    expect(d?.google.calendars).toEqual([]);
  });

  it("drops an instance on cleanup", () => {
    seed();
    useCalendarStore.getState().removeInstance(ID);
    expect(data()).toBeUndefined();
  });
});

describe("useCalendarStore.migrate", () => {
  const migrate = useCalendarStore.persist.getOptions().migrate;

  it("migrates legacy singleton data under the calendar instance key", () => {
    const legacy = {
      events: [createEvent()],
      lookaheadDays: 14,
      enabled: false,
      view: "list",
      google: {
        calendars: [createCalendar({ selected: true })],
        enabledCalendarIds: ["primary"],
        failedCalendarIds: [],
      },
      microsoft: { calendars: [], enabledCalendarIds: [], failedCalendarIds: [] },
      primarySource: "microsoft",
      refreshIntervalHours: 12,
    };

    expect(migrate?.(legacy, 1)).toEqual({ byInstance: { calendar: legacy } });
  });

  it("drops unrecognized legacy data", () => {
    expect(migrate?.({ events: "nope" }, 1)).toEqual({ byInstance: {} });
  });

  it("passes current-version data through unchanged", () => {
    const persisted = {
      byInstance: {
        [ID]: {
          events: [],
          lookaheadDays: 7,
          enabled: true,
          view: "calendar",
          google: { calendars: [], enabledCalendarIds: [], failedCalendarIds: [] },
          microsoft: { calendars: [], enabledCalendarIds: [], failedCalendarIds: [] },
          primarySource: "google",
          refreshIntervalHours: 6,
        },
      },
    };
    expect(migrate?.(persisted, 2)).toBe(persisted);
  });
});
