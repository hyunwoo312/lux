import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { loadErrorMessage } from "@/lib/net";
import { mergePersisted, tolerantArray, tolerantRecord } from "@/lib/persist";
import { createGatedChromeStorage } from "@/lib/storage";
import { registerInstanceCleanup } from "@/widgets/core/instanceCleanup";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
import { isConnected, useIntegrationStore } from "@/integrations";
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
  dateFromKey,
  getDateKey,
  getMonthGridDays,
  getMonthOffset,
  startOfDay,
} from "@/widgets/calendar/lib/dates";
import { isCalendarSyncCoolingDown } from "@/widgets/calendar/lib/cooldown";
import {
  CALENDAR_DENSITIES,
  CALENDAR_PROVIDER_IDS,
  CALENDAR_VIEWS,
  LEGACY_CALENDAR_VIEWS,
  calendarEventSchema,
  connectedCalendarSchema,
  MAX_CALENDAR_EVENTS,
  MAX_LOOKAHEAD_DAYS,
  MIN_LOOKAHEAD_DAYS,
  type CalendarEvent,
  type CalendarEventsResult,
  type CalendarEventWindow,
  type CalendarMode,
  type CalendarProviderId,
  type CalendarSyncStatus,
  type CalendarDensity,
  type CalendarView,
  type ConnectedCalendar,
} from "@/widgets/calendar/types";

const SYNC_PAST_MONTHS = 12;
const SYNC_FUTURE_MONTHS = 12;

type ProviderCalendarSettings = {
  calendars: ConnectedCalendar[];
  enabledCalendarIds: string[];
  selectionChosen?: boolean;
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
  density: CalendarDensity;
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
  listAnchorSetOn: string;
};

type SyncOptions = { bypassCooldown?: boolean; providerId?: CalendarProviderId };

type CalendarState = {
  byInstance: Record<string, CalendarData>;
  setView: (instanceId: string, view: CalendarView) => void;
  setDensity: (instanceId: string, density: CalendarDensity) => void;
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
  "visibleMonth" | "mode" | "selectedDay" | "focusRowIndex" | "listAnchor" | "listAnchorSetOn"
> {
  const now = new Date();
  return {
    visibleMonth: new Date(now.getFullYear(), now.getMonth(), 1),
    mode: "month",
    selectedDay: null,
    focusRowIndex: 0,
    listAnchor: startOfDay(now),
    listAnchorSetOn: getDateKey(now),
  };
}

function anchorFor(
  key: string | undefined,
  setOn: string | undefined,
): Pick<CalendarData, "listAnchor" | "listAnchorSetOn"> {
  const today = startOfDay(new Date());
  const todayKey = getDateKey(today);
  if (!key || setOn !== todayKey) return { listAnchor: today, listAnchorSetOn: todayKey };
  const stored = dateFromKey(key);
  return stored
    ? { listAnchor: startOfDay(stored), listAnchorSetOn: setOn }
    : { listAnchor: today, listAnchorSetOn: todayKey };
}

export function createDefaultData(): CalendarData {
  return {
    events: [],
    lookaheadDays: 7,
    enabled: true,
    view: "agenda",
    density: "comfortable",
    google: EMPTY_PROVIDER,
    microsoft: EMPTY_PROVIDER,
    primarySource: "google",
    refreshIntervalHours: 6,
    status: "idle",
    syncing: [],
    resyncPending: [],
    ...freshNav(),
  };
}

const DEFAULT_DATA = createDefaultData();

const providerSettingsSchema = z.object({
  calendars: tolerantArray(connectedCalendarSchema),
  enabledCalendarIds: tolerantArray(z.string()),
  failedCalendarIds: tolerantArray(z.string()),
  selectionChosen: z.boolean().optional().catch(undefined),
  lastError: z.string().optional().catch(undefined),
  lastSyncedAt: z.string().optional().catch(undefined),
});

const configSchema = z.object({
  events: tolerantArray(calendarEventSchema),
  lookaheadDays: z.number().catch(7),
  enabled: z.boolean().catch(true),
  view: z.enum(CALENDAR_VIEWS).catch("agenda"),
  density: z.enum(CALENDAR_DENSITIES).catch("comfortable"),
  google: providerSettingsSchema.catch(EMPTY_PROVIDER),
  microsoft: providerSettingsSchema.catch(EMPTY_PROVIDER),
  primarySource: z.enum(["google", "microsoft"]).catch("google"),
  refreshIntervalHours: z.number().catch(6),
  listAnchorKey: z.string().optional().catch(undefined),
  listAnchorSetOn: z.string().optional().catch(undefined),
});

const persistedSchema = z.object({
  byInstance: tolerantRecord(configSchema, normaliseConfig),
});

const LEGACY_KEYS = [
  "view",
  "lookaheadDays",
  "enabled",
  "google",
  "microsoft",
  "primarySource",
  "refreshIntervalHours",
] as const;

function looksLikeLegacySingleton(persisted: unknown): boolean {
  if (!persisted || typeof persisted !== "object") return false;
  return LEGACY_KEYS.some((key) => key in persisted);
}

function normaliseConfig(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const data = value as Record<string, unknown>;
  const remapped = typeof data.view === "string" ? LEGACY_CALENDAR_VIEWS[data.view] : undefined;
  return remapped ? { ...data, view: remapped } : data;
}

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
    timeMin: new Date(now.getFullYear(), now.getMonth() - SYNC_PAST_MONTHS, 1),
    timeMax: new Date(now.getFullYear(), now.getMonth() + SYNC_FUTURE_MONTHS, 1),
  };
}

export function capCalendarEvents(events: CalendarEvent[], now = new Date()): CalendarEvent[] {
  const sorted = [...events].sort(compareEventsByStart);
  if (sorted.length <= MAX_CALENDAR_EVENTS) return sorted;

  const cutoff = now.getTime();
  const upcoming = sorted.filter((event) => new Date(event.endsAt).getTime() >= cutoff);
  const past = sorted.filter((event) => new Date(event.endsAt).getTime() < cutoff);
  const kept = upcoming.slice(0, MAX_CALENDAR_EVENTS);
  const remaining = MAX_CALENDAR_EVENTS - kept.length;

  if (remaining > 0) kept.push(...past.slice(-remaining));
  return kept.sort(compareEventsByStart);
}

function resolveEnabledCalendarIds(
  calendars: ConnectedCalendar[],
  previousIds: string[],
  chosen: boolean,
): string[] {
  const existing = previousIds.filter((id) => calendars.some((calendar) => calendar.id === id));
  if (existing.length || chosen) return existing;
  const primary = calendars.find((calendar) => calendar.primary) ?? calendars[0];
  return primary ? [primary.id] : [];
}

async function syncProvider(
  current: ProviderCalendarSettings,
  fetchCalendars: () => Promise<ConnectedCalendar[]>,
  fetchEvents: (window: CalendarEventWindow) => Promise<CalendarEventsResult>,
  syncWindow: SyncWindow,
): Promise<ProviderSyncResult> {
  try {
    const calendars = await fetchCalendars();
    const enabledCalendarIds = resolveEnabledCalendarIds(
      calendars,
      current.enabledCalendarIds,
      current.selectionChosen ?? false,
    );
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
    const message =
      error instanceof Error
        ? loadErrorMessage(error, "Couldn’t sync your calendar.")
        : "Couldn’t sync your calendar.";
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
      setDensity: (instanceId, density) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, density }))),
      setView: (instanceId, view) =>
        set((state) =>
          update(state, instanceId, (data) => {
            if (view === "calendar") return { ...data, view };
            if (data.mode !== "week" || !data.selectedDay) return { ...data, view };
            return {
              ...data,
              view,
              listAnchor: startOfDay(data.selectedDay),
              listAnchorSetOn: getDateKey(new Date()),
            };
          }),
        ),
      setListAnchor: (instanceId, date) =>
        set((state) =>
          update(state, instanceId, (data) => ({
            ...data,
            listAnchor: startOfDay(date),
            listAnchorSetOn: getDateKey(new Date()),
          })),
        ),
      setLookaheadDays: (instanceId, days) =>
        set((state) =>
          update(state, instanceId, (data) => ({ ...data, lookaheadDays: clampLookahead(days) })),
        ),
      setEnabled: (instanceId, enabled) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, enabled }))),
      sync: async (instanceId, options = {}) => {
        const data = getCalendarData(instanceId);
        const accounts = useIntegrationStore.getState().accounts;

        const requested = CALENDAR_PROVIDER_IDS.filter(
          (providerId) =>
            isConnected(accounts, providerId) &&
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

            const refreshed = results
              .filter((entry) => !entry.result.failed)
              .map((entry) => entry.providerId);
            const keptEvents = current.events.filter(
              (event) => !refreshed.some((providerId) => event.id.startsWith(`${providerId}-`)),
            );
            const events = capCalendarEvents([
              ...keptEvents,
              ...results.flatMap((entry) => entry.result.events),
            ]);

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
              selectionChosen: true,
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
            if (data.view !== "calendar") {
              const today = startOfDay(new Date());
              return { ...data, listAnchor: today, listAnchorSetOn: getDateKey(today) };
            }
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
        set((state) =>
          update(state, instanceId, (data) => ({ ...data, selectedDay: startOfDay(date) })),
        ),
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
      onRehydrateStorage: () => () => gatedStorage.open(useCalendarStore),
      partialize: (state) => ({
        byInstance: Object.fromEntries(
          Object.entries(state.byInstance).map(([id, data]) => [
            id,
            {
              events: data.events,
              lookaheadDays: data.lookaheadDays,
              enabled: data.enabled,
              view: data.view,
              density: data.density,
              google: data.google,
              microsoft: data.microsoft,
              primarySource: data.primarySource,
              refreshIntervalHours: data.refreshIntervalHours,
              listAnchorKey: getDateKey(data.listAnchor),
              listAnchorSetOn: data.listAnchorSetOn,
            },
          ]),
        ),
      }),
      migrate: (persisted, version) => {
        if (version >= 2) return persisted;
        if (!looksLikeLegacySingleton(persisted)) return { byInstance: {} };
        const legacy = configSchema.safeParse(normaliseConfig(persisted));
        return { byInstance: legacy.success ? { calendar: legacy.data } : {} };
      },
      merge: (persisted, current) =>
        mergePersisted("widget:calendar", persistedSchema, persisted, current, (parsed) => {
          const byInstance: Record<string, CalendarData> = {};
          for (const [id, config] of Object.entries(parsed.byInstance)) {
            byInstance[id] = {
              ...config,
              events: capCalendarEvents(config.events),
              lookaheadDays: clampLookahead(config.lookaheadDays),
              refreshIntervalHours: clampRefreshInterval(config.refreshIntervalHours),
              status: "idle",
              syncing: [],
              resyncPending: [],
              ...freshNav(),
              ...anchorFor(config.listAnchorKey, config.listAnchorSetOn),
            };
          }
          return { ...current, byInstance };
        }),
    },
  ),
);

registerInstanceCleanup((instanceId) => useCalendarStore.getState().removeInstance(instanceId));

export const useCalendar = createInstanceSelector(useCalendarStore, DEFAULT_DATA);
