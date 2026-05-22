import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { useIntegrationStore } from "@/integrations";
import {
  fetchGoogleCalendarEvents,
  fetchGoogleCalendars,
} from "@/widgets/calendar/lib/google-calendar-api";
import {
  fetchOutlookCalendarEvents,
  fetchOutlookCalendars,
} from "@/widgets/calendar/lib/outlook-calendar-api";
import { compareEventsByStart } from "@/widgets/calendar/lib/agenda";
import {
  addDays,
  getDateKey,
  getMonthGridDays,
  getMonthOffset,
  startOfDay,
} from "@/widgets/calendar/lib/dates";
import { isCalendarSyncCoolingDown } from "@/widgets/calendar/lib/cooldown";
import {
  calendarEventSchema,
  CALENDAR_VIEWS,
  connectedCalendarSchema,
  MAX_CALENDAR_EVENTS,
  MAX_LOOKAHEAD_DAYS,
  MIN_LOOKAHEAD_DAYS,
  type CalendarEvent,
  type CalendarMode,
  type CalendarProviderId,
  type CalendarSyncStatus,
  type CalendarView,
  type ConnectedCalendar,
} from "@/widgets/calendar/types";

const SYNC_WINDOW_MONTHS = 6;

type ProviderCalendarSettings = {
  calendars: ConnectedCalendar[];
  enabledCalendarIds: string[];
  failedCalendarIds: string[];
  lastError?: string;
  lastSyncedAt?: string;
};

type SyncWindow = { timeMin: Date; timeMax: Date };

type ProviderSyncResult = {
  settings: ProviderCalendarSettings;
  events: CalendarEvent[];
  failed: boolean;
};

type CalendarState = {
  events: CalendarEvent[];
  lookaheadDays: number;
  enabled: boolean;
  view: CalendarView;
  google: ProviderCalendarSettings;
  microsoft: ProviderCalendarSettings;
  primarySource: CalendarProviderId;
  refreshIntervalHours: number;
  status: CalendarSyncStatus;
  syncing: CalendarProviderId[];
  visibleMonth: Date;
  mode: CalendarMode;
  selectedDay: Date | null;
  focusRowIndex: number;
  listAnchor: Date;
  setView: (view: CalendarView) => void;
  setListAnchor: (date: Date) => void;
  setLookaheadDays: (days: number) => void;
  setPrimarySource: (provider: CalendarProviderId) => void;
  setRefreshIntervalHours: (hours: number) => void;
  setEnabled: (enabled: boolean) => void;
  sync: (options?: { bypassCooldown?: boolean; providerId?: CalendarProviderId }) => Promise<void>;
  setCalendarSelection: (
    providerId: CalendarProviderId,
    calendarId: string,
    selected: boolean,
  ) => void;
  clearIntegration: (providerId: CalendarProviderId) => void;
  setVisibleMonth: (month: Date) => void;
  shiftMonth: (offset: number) => void;
  goToToday: () => void;
  focusDay: (date: Date) => void;
  selectDay: (date: Date) => void;
  shiftWeek: (offset: number) => void;
  exitWeek: () => void;
};

const EMPTY_PROVIDER: ProviderCalendarSettings = {
  calendars: [],
  enabledCalendarIds: [],
  failedCalendarIds: [],
};

const providerSettingsSchema = z.object({
  calendars: z.array(connectedCalendarSchema).default([]),
  enabledCalendarIds: z.array(z.string()).default([]),
  failedCalendarIds: z.array(z.string()).default([]),
  lastError: z.string().optional(),
  lastSyncedAt: z.string().optional(),
});

const persistedSchema = z.object({
  events: z.array(calendarEventSchema).default([]),
  lookaheadDays: z.number().default(7),
  enabled: z.boolean().default(true),
  view: z.enum(CALENDAR_VIEWS).default("calendar"),
  google: providerSettingsSchema.default(EMPTY_PROVIDER),
  microsoft: providerSettingsSchema.default(EMPTY_PROVIDER),
  primarySource: z.enum(["google", "microsoft"]).default("google"),
  refreshIntervalHours: z.number().default(6),
});

function clampLookahead(days: number): number {
  if (!Number.isFinite(days)) return 7;
  return Math.min(MAX_LOOKAHEAD_DAYS, Math.max(MIN_LOOKAHEAD_DAYS, Math.round(days)));
}

export const REFRESH_INTERVAL_OPTIONS = [3, 6, 12, 24] as const;

function clampRefreshInterval(hours: number): number {
  return (REFRESH_INTERVAL_OPTIONS as readonly number[]).includes(hours) ? hours : 6;
}

function getSyncWindow(): SyncWindow {
  const now = new Date();
  return {
    timeMin: new Date(now.getFullYear(), now.getMonth(), 1),
    timeMax: new Date(now.getFullYear(), now.getMonth() + SYNC_WINDOW_MONTHS, 1),
  };
}

function resolveEnabledCalendarIds(
  calendars: ConnectedCalendar[],
  previousIds: string[],
): string[] {
  const existing = previousIds.filter((id) => calendars.some((calendar) => calendar.id === id));
  if (existing.length) return existing;
  const primary = calendars.find((calendar) => calendar.primary) ?? calendars[0];
  return primary ? [primary.id] : [];
}

async function syncProvider(
  connected: boolean,
  current: ProviderCalendarSettings,
  fetchCalendars: (ids: readonly string[]) => Promise<ConnectedCalendar[]>,
  fetchEvents: (
    window: { calendarIds: string[]; timeMin: Date; timeMax: Date },
  ) => Promise<{ events: CalendarEvent[]; failedCalendarIds: string[] }>,
  syncWindow: SyncWindow,
): Promise<ProviderSyncResult> {
  if (!connected) return { settings: current, events: [], failed: false };

  try {
    const calendars = await fetchCalendars(current.enabledCalendarIds);
    const enabledCalendarIds = resolveEnabledCalendarIds(calendars, current.enabledCalendarIds);
    const markedCalendars = calendars.map((calendar) => ({
      ...calendar,
      selected: enabledCalendarIds.includes(calendar.id),
    }));
    const result = enabledCalendarIds.length
      ? await fetchEvents({ calendarIds: enabledCalendarIds, ...syncWindow })
      : { events: [], failedCalendarIds: [] };
    const failed = result.failedCalendarIds.length > 0;

    return {
      settings: {
        calendars: markedCalendars,
        enabledCalendarIds,
        failedCalendarIds: result.failedCalendarIds,
        lastError: failed ? "Some calendars failed to sync" : undefined,
      },
      events: result.events,
      failed,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Calendar sync failed";
    return {
      settings: { ...current, failedCalendarIds: current.enabledCalendarIds, lastError: message },
      events: [],
      failed: true,
    };
  }
}

const gatedStorage = createGatedChromeStorage();

function createInitialView(): { visibleMonth: Date } {
  const now = new Date();
  return { visibleMonth: new Date(now.getFullYear(), now.getMonth(), 1) };
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      events: [],
      lookaheadDays: 7,
      enabled: true,
      view: "calendar",
      google: EMPTY_PROVIDER,
      microsoft: EMPTY_PROVIDER,
      status: "idle",
      syncing: [],
      mode: "month",
      selectedDay: null,
      focusRowIndex: 0,
      listAnchor: startOfDay(new Date()),
      primarySource: "google",
      refreshIntervalHours: 6,
      ...createInitialView(),
      setPrimarySource: (provider) => set({ primarySource: provider }),
      setRefreshIntervalHours: (hours) =>
        set({ refreshIntervalHours: clampRefreshInterval(hours) }),
      setView: (view) =>
        set((state) => {
          if (view !== "list") return { view };
          const anchor =
            state.mode === "week" && state.selectedDay
              ? startOfDay(state.selectedDay)
              : startOfDay(new Date());
          return { view, listAnchor: anchor };
        }),
      setListAnchor: (date) => set({ listAnchor: startOfDay(date) }),
      setLookaheadDays: (days) => set({ lookaheadDays: clampLookahead(days) }),
      setEnabled: (enabled) => set({ enabled }),
      sync: async (options = {}) => {
        const state = get();
        const accounts = useIntegrationStore.getState().accounts;
        const isConnected = (providerId: CalendarProviderId) =>
          accounts.some((account) => account.providerId === providerId && account.status === "connected");

        const targets = (["google", "microsoft"] as const).filter(
          (providerId) =>
            isConnected(providerId) &&
            (!options.providerId || options.providerId === providerId) &&
            !state.syncing.includes(providerId) &&
            (options.bypassCooldown || !isCalendarSyncCoolingDown(state[providerId].lastSyncedAt)),
        );
        if (targets.length === 0) return;

        set((s) => ({
          status: "syncing",
          syncing: Array.from(new Set([...s.syncing, ...targets])),
          google: targets.includes("google") ? { ...s.google, lastError: undefined } : s.google,
          microsoft: targets.includes("microsoft")
            ? { ...s.microsoft, lastError: undefined }
            : s.microsoft,
        }));

        const syncWindow = getSyncWindow();
        const fetchers = {
          google: [fetchGoogleCalendars, fetchGoogleCalendarEvents] as const,
          microsoft: [fetchOutlookCalendars, fetchOutlookCalendarEvents] as const,
        };
        const results = await Promise.all(
          targets.map(async (providerId) => {
            const [fetchCalendars, fetchEvents] = fetchers[providerId];
            const result = await syncProvider(
              true,
              get()[providerId],
              fetchCalendars,
              fetchEvents,
              syncWindow,
            );
            return { providerId, result };
          }),
        );

        set((s) => {
          const now = new Date().toISOString();
          let google = s.google;
          let microsoft = s.microsoft;
          for (const { providerId, result } of results) {
            const settings = result.failed
              ? result.settings
              : { ...result.settings, lastSyncedAt: now };
            if (providerId === "google") google = settings;
            else microsoft = settings;
          }

          const keptEvents = s.events.filter(
            (event) => !targets.some((providerId) => event.id.startsWith(`${providerId}-`)),
          );
          const events = [...keptEvents, ...results.flatMap((entry) => entry.result.events)]
            .sort(compareEventsByStart)
            .slice(0, MAX_CALENDAR_EVENTS);

          const syncing = s.syncing.filter((providerId) => !targets.includes(providerId));
          const hasError = Boolean(google.lastError || microsoft.lastError);
          return {
            events,
            google,
            microsoft,
            syncing,
            status: syncing.length > 0 ? "syncing" : hasError ? "error" : "idle",
          };
        });

        await useIntegrationStore.getState().load();
      },
      setCalendarSelection: (providerId, calendarId, selected) =>
        set((state) => {
          const current = state[providerId];
          const enabledCalendarIds = selected
            ? Array.from(new Set([...current.enabledCalendarIds, calendarId]))
            : current.enabledCalendarIds.filter((id) => id !== calendarId);
          const updated: ProviderCalendarSettings = {
            ...current,
            enabledCalendarIds,
            calendars: current.calendars.map((calendar) =>
              calendar.id === calendarId ? { ...calendar, selected } : calendar,
            ),
            failedCalendarIds: current.failedCalendarIds.filter((id) => id !== calendarId),
          };
          return providerId === "google" ? { google: updated } : { microsoft: updated };
        }),
      clearIntegration: (providerId) =>
        set((state) => {
          const events = state.events.filter((event) => !event.id.startsWith(`${providerId}-`));
          return providerId === "google"
            ? { events, google: EMPTY_PROVIDER }
            : { events, microsoft: EMPTY_PROVIDER };
        }),
      setVisibleMonth: (visibleMonth) => set({ visibleMonth }),
      shiftMonth: (offset) => set((state) => ({ visibleMonth: getMonthOffset(state.visibleMonth, offset) })),
      goToToday: () =>
        set((state) => {
          if (state.view === "list") return { listAnchor: startOfDay(new Date()) };
          if (state.mode !== "week") return createInitialView();
          const today = startOfDay(new Date());
          const visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const todayKey = getDateKey(today);
          const index = getMonthGridDays(visibleMonth).findIndex(
            (day) => getDateKey(day) === todayKey,
          );
          return {
            selectedDay: today,
            visibleMonth,
            focusRowIndex: index >= 0 ? Math.floor(index / 7) : 0,
          };
        }),
      focusDay: (date) => {
        const grid = getMonthGridDays(get().visibleMonth);
        const key = getDateKey(date);
        const index = grid.findIndex((day) => getDateKey(day) === key);
        set({
          mode: "week",
          selectedDay: startOfDay(date),
          focusRowIndex: index >= 0 ? Math.floor(index / 7) : 0,
        });
      },
      selectDay: (date) => set({ selectedDay: startOfDay(date) }),
      shiftWeek: (offset) =>
        set((state) =>
          state.selectedDay ? { selectedDay: addDays(state.selectedDay, offset * 7) } : state,
        ),
      exitWeek: () =>
        set((state) => ({
          mode: "month",
          visibleMonth: state.selectedDay
            ? new Date(state.selectedDay.getFullYear(), state.selectedDay.getMonth(), 1)
            : state.visibleMonth,
        })),
    }),
    {
      name: "widget:calendar",
      storage: createJSONStorage(() => gatedStorage),
      version: 1,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({
        events: state.events,
        lookaheadDays: state.lookaheadDays,
        enabled: state.enabled,
        view: state.view,
        google: state.google,
        microsoft: state.microsoft,
        primarySource: state.primarySource,
        refreshIntervalHours: state.refreshIntervalHours,
      }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        return {
          ...current,
          ...parsed.data,
          lookaheadDays: clampLookahead(parsed.data.lookaheadDays),
          refreshIntervalHours: clampRefreshInterval(parsed.data.refreshIntervalHours),
        };
      },
    },
  ),
);
