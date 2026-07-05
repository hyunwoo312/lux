import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { registerInstanceCleanup } from "@/widgets/core/instanceCleanup";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
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

export type CalendarData = {
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
  resyncPending: CalendarProviderId[];
  visibleMonth: Date;
  mode: CalendarMode;
  selectedDay: Date | null;
  focusRowIndex: number;
  listAnchor: Date;
};

type SyncOptions = { bypassCooldown?: boolean; providerId?: CalendarProviderId };

type CalendarState = {
  byInstance: Record<string, CalendarData>;
  setView: (instanceId: string, view: CalendarView) => void;
  setListAnchor: (instanceId: string, date: Date) => void;
  setLookaheadDays: (instanceId: string, days: number) => void;
  setPrimarySource: (instanceId: string, provider: CalendarProviderId) => void;
  setRefreshIntervalHours: (instanceId: string, hours: number) => void;
  setEnabled: (instanceId: string, enabled: boolean) => void;
  sync: (instanceId: string, options?: SyncOptions) => Promise<void>;
  setCalendarSelection: (
    instanceId: string,
    providerId: CalendarProviderId,
    calendarId: string,
    selected: boolean,
  ) => void;
  clearIntegration: (instanceId: string, providerId: CalendarProviderId) => void;
  setVisibleMonth: (instanceId: string, month: Date) => void;
  shiftMonth: (instanceId: string, offset: number) => void;
  goToToday: (instanceId: string) => void;
  focusDay: (instanceId: string, date: Date) => void;
  selectDay: (instanceId: string, date: Date) => void;
  shiftWeek: (instanceId: string, offset: number) => void;
  exitWeek: (instanceId: string) => void;
  removeInstance: (instanceId: string) => void;
};

const EMPTY_PROVIDER: ProviderCalendarSettings = {
  calendars: [],
  enabledCalendarIds: [],
  failedCalendarIds: [],
};

function freshNav(): Pick<
  CalendarData,
  | "status"
  | "syncing"
  | "resyncPending"
  | "visibleMonth"
  | "mode"
  | "selectedDay"
  | "focusRowIndex"
  | "listAnchor"
> {
  const now = new Date();
  return {
    status: "idle",
    syncing: [],
    resyncPending: [],
    visibleMonth: new Date(now.getFullYear(), now.getMonth(), 1),
    mode: "month",
    selectedDay: null,
    focusRowIndex: 0,
    listAnchor: startOfDay(now),
  };
}

function createDefaultData(): CalendarData {
  return {
    events: [],
    lookaheadDays: 7,
    enabled: true,
    view: "calendar",
    google: EMPTY_PROVIDER,
    microsoft: EMPTY_PROVIDER,
    primarySource: "google",
    refreshIntervalHours: 6,
    ...freshNav(),
  };
}

const DEFAULT_DATA = createDefaultData();

const providerSettingsSchema = z.object({
  calendars: z.array(connectedCalendarSchema).default([]),
  enabledCalendarIds: z.array(z.string()).default([]),
  failedCalendarIds: z.array(z.string()).default([]),
  lastError: z.string().optional(),
  lastSyncedAt: z.string().optional(),
});

const configSchema = z.object({
  events: z.array(calendarEventSchema).default([]),
  lookaheadDays: z.number().default(7),
  enabled: z.boolean().default(true),
  view: z.enum(CALENDAR_VIEWS).default("calendar"),
  google: providerSettingsSchema.default(EMPTY_PROVIDER),
  microsoft: providerSettingsSchema.default(EMPTY_PROVIDER),
  primarySource: z.enum(["google", "microsoft"]).default("google"),
  refreshIntervalHours: z.number().default(6),
});

const persistedSchema = z.object({
  byInstance: z.record(z.string(), configSchema),
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

function update(
  state: CalendarState,
  instanceId: string,
  fn: (data: CalendarData) => CalendarData,
): Pick<CalendarState, "byInstance"> {
  return { byInstance: patchInstance(state.byInstance, instanceId, DEFAULT_DATA, fn) };
}

export function getCalendarData(instanceId: string): CalendarData {
  return useCalendarStore.getState().byInstance[instanceId] ?? DEFAULT_DATA;
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      byInstance: {},
      setPrimarySource: (instanceId, provider) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, primarySource: provider }))),
      setRefreshIntervalHours: (instanceId, hours) =>
        set((state) =>
          update(state, instanceId, (data) => ({
            ...data,
            refreshIntervalHours: clampRefreshInterval(hours),
          })),
        ),
      setView: (instanceId, view) =>
        set((state) =>
          update(state, instanceId, (data) => {
            if (view !== "list") return { ...data, view };
            const anchor =
              data.mode === "week" && data.selectedDay
                ? startOfDay(data.selectedDay)
                : startOfDay(new Date());
            return { ...data, view, listAnchor: anchor };
          }),
        ),
      setListAnchor: (instanceId, date) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, listAnchor: startOfDay(date) }))),
      setLookaheadDays: (instanceId, days) =>
        set((state) =>
          update(state, instanceId, (data) => ({ ...data, lookaheadDays: clampLookahead(days) })),
        ),
      setEnabled: (instanceId, enabled) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, enabled }))),
      sync: async (instanceId, options = {}) => {
        const data = getCalendarData(instanceId);
        const accounts = useIntegrationStore.getState().accounts;
        const isConnected = (providerId: CalendarProviderId) =>
          accounts.some(
            (account) => account.providerId === providerId && account.status === "connected",
          );

        const requested = (["google", "microsoft"] as const).filter(
          (providerId) =>
            isConnected(providerId) &&
            (!options.providerId || options.providerId === providerId),
        );
        const busy = requested.filter((providerId) => data.syncing.includes(providerId));
        const targets = requested.filter(
          (providerId) =>
            !data.syncing.includes(providerId) &&
            (options.bypassCooldown || !isCalendarSyncCoolingDown(data[providerId].lastSyncedAt)),
        );
        if (options.bypassCooldown && busy.length > 0) {
          set((state) =>
            update(state, instanceId, (current) => ({
              ...current,
              resyncPending: Array.from(new Set([...current.resyncPending, ...busy])),
            })),
          );
        }
        if (targets.length === 0) return;

        set((state) =>
          update(state, instanceId, (current) => ({
            ...current,
            status: "syncing",
            syncing: Array.from(new Set([...current.syncing, ...targets])),
            google: targets.includes("google")
              ? { ...current.google, lastError: undefined }
              : current.google,
            microsoft: targets.includes("microsoft")
              ? { ...current.microsoft, lastError: undefined }
              : current.microsoft,
          })),
        );

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
              getCalendarData(instanceId)[providerId],
              fetchCalendars,
              fetchEvents,
              syncWindow,
            );
            return { providerId, result };
          }),
        );

        const pendingBeforeCompletion = getCalendarData(instanceId).resyncPending;
        set((state) =>
          update(state, instanceId, (current) => {
            const now = new Date().toISOString();
            let google = current.google;
            let microsoft = current.microsoft;
            for (const { providerId, result } of results) {
              const settings = result.failed
                ? result.settings
                : { ...result.settings, lastSyncedAt: now };
              if (providerId === "google") google = settings;
              else microsoft = settings;
            }

            const keptEvents = current.events.filter(
              (event) => !targets.some((providerId) => event.id.startsWith(`${providerId}-`)),
            );
            const events = [...keptEvents, ...results.flatMap((entry) => entry.result.events)]
              .sort(compareEventsByStart)
              .slice(0, MAX_CALENDAR_EVENTS);

            const syncing = current.syncing.filter((providerId) => !targets.includes(providerId));
            const hasError = Boolean(google.lastError || microsoft.lastError);
            return {
              ...current,
              events,
              google,
              microsoft,
              syncing,
              resyncPending: current.resyncPending.filter(
                (providerId) => !targets.includes(providerId),
              ),
              status: syncing.length > 0 ? "syncing" : hasError ? "error" : "idle",
            };
          }),
        );

        const resync = targets.filter((providerId) => pendingBeforeCompletion.includes(providerId));
        for (const providerId of resync) {
          void get().sync(instanceId, { bypassCooldown: true, providerId });
        }
      },
      setCalendarSelection: (instanceId, providerId, calendarId, selected) =>
        set((state) =>
          update(state, instanceId, (data) => {
            const current = data[providerId];
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
            return providerId === "google"
              ? { ...data, google: updated }
              : { ...data, microsoft: updated };
          }),
        ),
      clearIntegration: (instanceId, providerId) =>
        set((state) =>
          update(state, instanceId, (data) => {
            const events = data.events.filter((event) => !event.id.startsWith(`${providerId}-`));
            return providerId === "google"
              ? { ...data, events, google: EMPTY_PROVIDER }
              : { ...data, events, microsoft: EMPTY_PROVIDER };
          }),
        ),
      setVisibleMonth: (instanceId, visibleMonth) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, visibleMonth }))),
      shiftMonth: (instanceId, offset) =>
        set((state) =>
          update(state, instanceId, (data) => ({
            ...data,
            visibleMonth: getMonthOffset(data.visibleMonth, offset),
          })),
        ),
      goToToday: (instanceId) =>
        set((state) =>
          update(state, instanceId, (data) => {
            if (data.view === "list") return { ...data, listAnchor: startOfDay(new Date()) };
            if (data.mode !== "week") return { ...data, ...freshNav() };
            const today = startOfDay(new Date());
            const visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const todayKey = getDateKey(today);
            const index = getMonthGridDays(visibleMonth).findIndex(
              (day) => getDateKey(day) === todayKey,
            );
            return {
              ...data,
              selectedDay: today,
              visibleMonth,
              focusRowIndex: index >= 0 ? Math.floor(index / 7) : 0,
            };
          }),
        ),
      focusDay: (instanceId, date) =>
        set((state) =>
          update(state, instanceId, (data) => {
            const grid = getMonthGridDays(data.visibleMonth);
            const key = getDateKey(date);
            const index = grid.findIndex((day) => getDateKey(day) === key);
            return {
              ...data,
              mode: "week",
              selectedDay: startOfDay(date),
              focusRowIndex: index >= 0 ? Math.floor(index / 7) : 0,
            };
          }),
        ),
      selectDay: (instanceId, date) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, selectedDay: startOfDay(date) }))),
      shiftWeek: (instanceId, offset) =>
        set((state) =>
          update(state, instanceId, (data) =>
            data.selectedDay
              ? { ...data, selectedDay: addDays(data.selectedDay, offset * 7) }
              : data,
          ),
        ),
      exitWeek: (instanceId) =>
        set((state) =>
          update(state, instanceId, (data) => ({
            ...data,
            mode: "month",
            visibleMonth: data.selectedDay
              ? new Date(data.selectedDay.getFullYear(), data.selectedDay.getMonth(), 1)
              : data.visibleMonth,
          })),
        ),
      removeInstance: (instanceId) =>
        set((state) => ({ byInstance: dropInstance(state.byInstance, instanceId) })),
    }),
    {
      name: "widget:calendar",
      storage: gatedStorage,
      version: 2,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({
        byInstance: Object.fromEntries(
          Object.entries(state.byInstance).map(([id, data]) => [
            id,
            {
              events: data.events,
              lookaheadDays: data.lookaheadDays,
              enabled: data.enabled,
              view: data.view,
              google: data.google,
              microsoft: data.microsoft,
              primarySource: data.primarySource,
              refreshIntervalHours: data.refreshIntervalHours,
            },
          ]),
        ),
      }),
      migrate: (persisted, version) => {
        if (version >= 2) return persisted;
        const legacy = configSchema.safeParse(persisted);
        return { byInstance: legacy.success ? { calendar: legacy.data } : {} };
      },
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        const byInstance: Record<string, CalendarData> = {};
        for (const [id, config] of Object.entries(parsed.data.byInstance)) {
          byInstance[id] = {
            ...config,
            lookaheadDays: clampLookahead(config.lookaheadDays),
            refreshIntervalHours: clampRefreshInterval(config.refreshIntervalHours),
            ...freshNav(),
          };
        }
        return { ...current, byInstance };
      },
    },
  ),
);

registerInstanceCleanup((instanceId) => useCalendarStore.getState().removeInstance(instanceId));

export const useCalendar = createInstanceSelector(useCalendarStore, DEFAULT_DATA);
