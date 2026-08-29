import { beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimitError } from "@/lib/net";
import { localDayKey } from "@/lib/clock";
import { addDays, startOfDay } from "@/widgets/calendar/lib/dates";
import { MAX_CALENDAR_EVENTS } from "@/widgets/calendar/types";
import { useIntegrationStore } from "@/integrations";
import {
  fetchGoogleCalendarEvents,
  fetchGoogleCalendars,
} from "@/widgets/calendar/lib/google-calendar-api";
import {
  capCalendarEvents,
  createDefaultData,
  useCalendarStore,
  type CalendarData,
} from "@/widgets/calendar/useCalendarStore";
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
  return { ...createDefaultData(), view: "calendar", ...over };
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

  it("keeps the events it already had when a sync fails, so the widget still works offline", async () => {
    fetchCalendarsMock.mockResolvedValue([createCalendar()]);
    fetchEventsMock.mockResolvedValue({ events: [createEvent()], failedCalendarIds: [] });
    await useCalendarStore.getState().sync(ID);
    expect(data()?.events).toHaveLength(1);

    fetchCalendarsMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await useCalendarStore.getState().sync(ID, { bypassCooldown: true });

    expect(data()?.status).toBe("error");
    expect(data()?.events).toHaveLength(1);
  });

  it("records an error status when a calendar fails", async () => {
    fetchCalendarsMock.mockResolvedValue([createCalendar()]);
    fetchEventsMock.mockResolvedValue({ events: [], failedCalendarIds: ["primary"] });

    await useCalendarStore.getState().sync(ID);

    expect(data()?.status).toBe("error");
    expect(data()?.google.lastError).toBeDefined();
  });

  it("captures a thrown sync failure as error state without leaking the raw message", async () => {
    fetchCalendarsMock.mockRejectedValue(
      new Error("Google calendar events request failed for c_9a8f7@group.calendar.google.com"),
    );

    await useCalendarStore.getState().sync(ID);

    const d = data();
    expect(d?.status).toBe("error");
    expect(d?.google.lastError).toBe("Couldn’t sync your calendar.");
    expect(d?.google.lastError).not.toContain("group.calendar.google.com");
  });

  it("still shows a rate limit in the user's own words", async () => {
    fetchCalendarsMock.mockRejectedValue(new RateLimitError(30_000));

    await useCalendarStore.getState().sync(ID);

    expect(data()?.google.lastError).toMatch(/Rate limited/);
  });

  it("skips syncing while cooling down unless bypassed", async () => {
    seed({
      google: {
        calendars: [],
        enabledCalendarIds: [],
        failedCalendarIds: [],
        lastSyncedAt: Date.now(),
      },
    });

    await useCalendarStore.getState().sync(ID);
    expect(fetchCalendarsMock).not.toHaveBeenCalled();

    fetchCalendarsMock.mockResolvedValue([createCalendar()]);
    fetchEventsMock.mockResolvedValue({ events: [], failedCalendarIds: [] });
    await useCalendarStore.getState().sync(ID, { bypassCooldown: true });
    expect(fetchCalendarsMock).toHaveBeenCalledTimes(1);
  });

  it("re-syncs a provider when a selection change arrives mid-sync", async () => {
    let resolveEvents:
      | ((value: { events: CalendarEvent[]; failedCalendarIds: string[] }) => void)
      | undefined;
    fetchCalendarsMock.mockResolvedValue([createCalendar()]);
    fetchEventsMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveEvents = resolve;
          }),
      )
      .mockResolvedValueOnce({ events: [createEvent()], failedCalendarIds: [] });

    const first = useCalendarStore.getState().sync(ID);
    expect(data()?.syncing).toEqual(["google"]);

    await useCalendarStore.getState().sync(ID, { bypassCooldown: true, providerId: "google" });
    expect(data()?.resyncPending).toEqual(["google"]);

    await vi.waitFor(() => expect(resolveEvents).toBeDefined());
    resolveEvents?.({ events: [], failedCalendarIds: [] });
    await first;

    await vi.waitFor(() => expect(fetchEventsMock).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(data()?.syncing).toEqual([]));
    expect(data()?.resyncPending).toEqual([]);
    expect(data()?.events).toHaveLength(1);
  });

  it("keeps an in-flight sync running when the user jumps to today", async () => {
    let resolveEvents:
      | ((value: { events: CalendarEvent[]; failedCalendarIds: string[] }) => void)
      | undefined;
    fetchCalendarsMock.mockResolvedValue([createCalendar()]);
    fetchEventsMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveEvents = resolve;
        }),
    );

    const first = useCalendarStore.getState().sync(ID);
    expect(data()?.syncing).toEqual(["google"]);

    await useCalendarStore.getState().sync(ID, { bypassCooldown: true, providerId: "google" });
    useCalendarStore.getState().goToToday(ID);

    expect(data()?.syncing).toEqual(["google"]);
    expect(data()?.resyncPending).toEqual(["google"]);
    expect(data()?.status).toBe("syncing");

    await vi.waitFor(() => expect(resolveEvents).toBeDefined());
    resolveEvents?.({ events: [], failedCalendarIds: [] });
    await first;

    await vi.waitFor(() => expect(fetchEventsMock).toHaveBeenCalledTimes(2));
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
});

describe("useCalendarStore.migrate", () => {
  const migrate = useCalendarStore.persist.getOptions().migrate;

  it("migrates legacy singleton data under the calendar instance key", () => {
    const legacy = {
      lookaheadDays: 14,
      enabled: false,
      view: "agenda",
      google: {
        calendars: [createCalendar({ selected: true })],
        enabledCalendarIds: ["primary"],
        failedCalendarIds: [],
      },
      microsoft: { calendars: [], enabledCalendarIds: [], failedCalendarIds: [] },
      primarySource: "microsoft",
      refreshIntervalHours: 12,
    };

    expect(migrate?.(legacy, 1)).toEqual({
      byInstance: { calendar: { ...legacy, density: "comfortable", events: [] } },
    });
  });

  it("does not invent an instance out of a blob with nothing recognisable in it", () => {
    expect(migrate?.({}, 1)).toEqual({ byInstance: {} });
    expect(migrate?.({ somethingElse: 1 }, 1)).toEqual({ byInstance: {} });
    expect(migrate?.("nonsense", 1)).toEqual({ byInstance: {} });
  });

  it("passes current-version data through unchanged", () => {
    const persisted = {
      byInstance: {
        [ID]: {
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

describe("useCalendarStore.merge", () => {
  const merge = useCalendarStore.persist.getOptions().merge;
  const mergeInto = (persisted: unknown) =>
    merge?.(persisted, {
      ...useCalendarStore.getState(),
      byInstance: {},
    }) as ReturnType<typeof useCalendarStore.getState>;

  const valid = {
    lookaheadDays: 14,
    enabled: true,
    view: "agenda",
    density: "compact",
    primarySource: "microsoft",
    refreshIntervalHours: 3,
  };

  it("keeps every other setting when one field is unreadable", () => {
    const merged = mergeInto({
      byInstance: { a: { ...valid, view: "nonsense", lookaheadDays: "14" } },
    });

    expect(merged.byInstance["a"]?.view).toBe("agenda");
    expect(merged.byInstance["a"]?.lookaheadDays).toBe(7);
    expect(merged.byInstance["a"]?.density).toBe("compact");
    expect(merged.byInstance["a"]?.primarySource).toBe("microsoft");
  });

  it("keeps the other instances when one of them is unreadable", () => {
    const merged = mergeInto({
      byInstance: { a: valid, b: "not-an-object", c: { ...valid, view: "calendar" } },
    });

    expect(Object.keys(merged.byInstance)).toEqual(["a", "c"]);
    expect(merged.byInstance["a"]?.view).toBe("agenda");
  });

  it("keeps the instance when one stored calendar is corrupt", () => {
    const merged = mergeInto({
      byInstance: {
        a: {
          ...valid,
          google: {
            calendars: [{ id: "good", summary: "Good" }, 42],
            enabledCalendarIds: ["good"],
            failedCalendarIds: [],
          },
        },
      },
    });

    expect(merged.byInstance["a"]?.google.calendars).toHaveLength(1);
    expect(merged.byInstance["a"]?.google.enabledCalendarIds).toEqual(["good"]);
  });

  it("moves readers off the retired view names", () => {
    expect(mergeInto({ byInstance: { a: { view: "list" } } }).byInstance["a"]?.view).toBe("agenda");
    expect(mergeInto({ byInstance: { a: { view: "calendar" } } }).byInstance["a"]?.view).toBe(
      "calendar",
    );
  });

  it("starts empty rather than throwing on a blob with no instances at all", () => {
    expect(mergeInto({}).byInstance).toEqual({});
    expect(mergeInto({ byInstance: null }).byInstance).toEqual({});
    expect(mergeInto({ byInstance: [] }).byInstance).toEqual({});
    expect(mergeInto(undefined).byInstance).toEqual({});
  });

  it("keeps the sync stamp so a new tab reads the cache instead of refetching", () => {
    const lastSyncedAt = Date.now();
    const merged = mergeInto({
      byInstance: {
        a: {
          ...valid,
          google: { calendars: [], enabledCalendarIds: [], failedCalendarIds: [], lastSyncedAt },
        },
      },
    });

    expect(merged.byInstance["a"]?.google.lastSyncedAt).toBe(lastSyncedAt);
  });

  it("restores the cached events so a new tab paints before any network call", () => {
    const merged = mergeInto({
      byInstance: { a: { ...valid, events: [createEvent()] } },
    });

    expect(merged.byInstance["a"]?.events).toHaveLength(1);
  });

  it("drops only the unreadable events from the cache", () => {
    const merged = mergeInto({
      byInstance: { a: { ...valid, events: [createEvent(), { id: "broken" }] } },
    });

    expect(merged.byInstance["a"]?.events).toHaveLength(1);
  });
});

describe("useCalendarStore.partialize", () => {
  it("writes the event cache so the next tab has something to read", () => {
    const partialize = useCalendarStore.persist.getOptions().partialize;
    seed({ events: [createEvent()] });

    const persisted = partialize?.(useCalendarStore.getState()) as {
      byInstance: Record<string, CalendarData>;
    };

    expect(persisted.byInstance[ID]?.events).toHaveLength(1);
  });
});

describe("capCalendarEvents", () => {
  const now = new Date("2026-08-23T12:00:00.000Z");
  const spread = (count: number, dayOffset: number) =>
    Array.from({ length: count }, (_, index) => {
      const start = new Date(now);
      start.setDate(start.getDate() + dayOffset * (index + 1));
      const end = new Date(start.getTime() + 30 * 60_000);
      return {
        ...createEvent(),
        id: `${dayOffset < 0 ? "past" : "future"}-${index}`,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
      };
    });

  it("leaves a small calendar untouched apart from ordering", () => {
    const capped = capCalendarEvents([...spread(3, 1), ...spread(3, -1)], now);
    expect(capped).toHaveLength(6);
    expect(capped.map((event) => new Date(event.startsAt).getTime())).toEqual(
      [...capped].map((event) => new Date(event.startsAt).getTime()).sort((a, b) => a - b),
    );
  });

  it("never lets a year of history push out upcoming events", () => {
    const capped = capCalendarEvents([...spread(MAX_CALENDAR_EVENTS, -1), ...spread(20, 1)], now);

    const upcoming = capped.filter((event) => new Date(event.endsAt).getTime() >= now.getTime());
    expect(capped).toHaveLength(MAX_CALENDAR_EVENTS);
    expect(upcoming).toHaveLength(20);
  });

  it("fills the remaining room with the most recent history", () => {
    const capped = capCalendarEvents([...spread(MAX_CALENDAR_EVENTS, -1), ...spread(2, 1)], now);

    const past = capped.filter((event) => new Date(event.endsAt).getTime() < now.getTime());
    const oldestKept = new Date(past[0]?.startsAt ?? 0).getTime();
    const dropped = new Date(now);
    dropped.setDate(dropped.getDate() - MAX_CALENDAR_EVENTS);

    expect(oldestKept).toBeGreaterThan(dropped.getTime());
  });
});

describe("the agenda anchor is scoped to the day it was chosen", () => {
  const merge = useCalendarStore.persist.getOptions().merge;
  const mergeInto = (config: Record<string, unknown>) =>
    merge?.(
      { byInstance: { one: config } },
      {
        ...useCalendarStore.getState(),
        byInstance: {},
      },
    ) as ReturnType<typeof useCalendarStore.getState>;
  const today = startOfDay(new Date());

  it("restores the date the user was looking at earlier the same day", () => {
    const chosen = addDays(today, 3);
    const merged = mergeInto({
      listAnchorKey: localDayKey(chosen),
      listAnchorSetOn: localDayKey(today),
    });

    expect(merged.byInstance["one"]?.listAnchor).toEqual(startOfDay(chosen));
  });

  it("falls back to today when the choice was made on an earlier day", () => {
    const merged = mergeInto({
      listAnchorKey: localDayKey(addDays(today, 3)),
      listAnchorSetOn: localDayKey(addDays(today, -1)),
    });

    expect(merged.byInstance["one"]?.listAnchor).toEqual(today);
  });

  it("opens on today when nothing was ever stored", () => {
    expect(mergeInto({}).byInstance["one"]?.listAnchor).toEqual(today);
  });

  it("records the day a choice was made, so tomorrow starts fresh", () => {
    useCalendarStore.setState({ byInstance: {} });
    useCalendarStore.getState().setListAnchor("one", addDays(today, 2));

    expect(useCalendarStore.getState().byInstance["one"]?.listAnchorSetOn).toBe(localDayKey(today));
  });
});
