import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { mergePersisted, tolerantArray, tolerantRecord } from "@/lib/persist";
import { createGatedChromeStorage } from "@/lib/storage";
import { registerInstanceCleanup } from "@/widgets/core/instanceCleanup";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
import { DEFAULT_LEAGUE_ID, LEAGUES } from "@/widgets/sports/lib/leagues";
import { DAY_WINDOWS, DEFAULT_DAY_WINDOW, type DayWindow } from "@/widgets/sports/lib/window";
import {
  MATCH_STATES,
  SPORTS_TABS,
  type LeagueFollowing,
  type MatchState,
  type SportsTab,
} from "@/widgets/sports/types";

const NO_FOLLOWING: LeagueFollowing = { teams: [] };

export type SportsData = {
  tab: SportsTab;
  collapsed: string[];
  leagueId: string;
  following: Record<string, LeagueFollowing>;
  states: MatchState[];
  window: DayWindow;
};

type SportsState = {
  byInstance: Record<string, SportsData>;
  setTab: (instanceId: string, tab: SportsTab) => void;
  setSectionOpen: (instanceId: string, sectionId: string, open: boolean) => void;
  setLeague: (instanceId: string, leagueId: string) => void;
  toggleTeam: (instanceId: string, leagueId: string, team: string) => void;
  toggleTour: (instanceId: string, leagueId: string) => void;
  setStates: (instanceId: string, states: MatchState[]) => void;
  setWindow: (instanceId: string, window: DayWindow) => void;
  removeInstance: (instanceId: string) => void;
};

const DEFAULT_STATES: MatchState[] = [...MATCH_STATES];

export const DEFAULT_DATA: SportsData = {
  tab: "discover",
  collapsed: [],
  leagueId: DEFAULT_LEAGUE_ID,
  following: {},
  states: DEFAULT_STATES,
  window: DEFAULT_DAY_WINDOW,
};

export const MAX_TEAMS = 5;
export const SPORTS_SYNC_COOLDOWN_MS = 30_000;

const LEAGUE_IDS = LEAGUES.map((league) => league.id);

const followingSchema = z.object({
  teams: tolerantArray(z.string()),
  tour: z.boolean().optional().catch(undefined),
});

const dataSchema = z.object({
  tab: z.enum(SPORTS_TABS).catch("discover"),
  collapsed: tolerantArray(z.string()),
  leagueId: z
    .string()
    .refine((id) => LEAGUE_IDS.includes(id))
    .catch(DEFAULT_LEAGUE_ID),
  following: tolerantRecord(followingSchema),
  states: z
    .array(z.enum(MATCH_STATES))
    .nonempty()
    .catch(() => [...DEFAULT_STATES] as [MatchState, ...MatchState[]]),
  window: z.enum(DAY_WINDOWS).catch(DEFAULT_DAY_WINDOW),
});

const persistedSchema = z.object({ byInstance: tolerantRecord(dataSchema) });

const legacySchema = z.object({
  leagueId: z.string().optional(),
  teams: tolerantArray(z.string()),
  states: z.array(z.enum(MATCH_STATES)).optional(),
  window: z.enum(DAY_WINDOWS).optional(),
});

export function migrateInstance(value: unknown): unknown {
  const legacy = legacySchema.safeParse(value);
  if (!legacy.success) return value;
  const { leagueId, teams, states, window } = legacy.data;
  if (!leagueId) return value;
  return {
    tab: "discover",
    collapsed: [],
    leagueId,
    following: teams.length > 0 ? { [leagueId]: { teams } } : {},
    states,
    window,
  };
}

const gatedStorage = createGatedChromeStorage();

function update(
  state: SportsState,
  instanceId: string,
  fn: (data: SportsData) => SportsData,
): Pick<SportsState, "byInstance"> {
  return { byInstance: patchInstance(state.byInstance, instanceId, DEFAULT_DATA, fn) };
}

function followingFor(data: SportsData, leagueId: string): LeagueFollowing {
  return data.following[leagueId] ?? NO_FOLLOWING;
}

export const useSportsStore = create<SportsState>()(
  persist(
    (set) => ({
      byInstance: {},
      setTab: (instanceId, tab) =>
        set((state) => update(state, instanceId, (d) => ({ ...d, tab }))),
      setSectionOpen: (instanceId, sectionId, open) =>
        set((state) =>
          update(state, instanceId, (d) => ({
            ...d,
            collapsed: open
              ? d.collapsed.filter((id) => id !== sectionId)
              : d.collapsed.includes(sectionId)
                ? d.collapsed
                : [...d.collapsed, sectionId],
          })),
        ),
      setLeague: (instanceId, leagueId) =>
        set((state) => update(state, instanceId, (d) => ({ ...d, leagueId }))),
      toggleTeam: (instanceId, leagueId, team) =>
        set((state) =>
          update(state, instanceId, (d) => {
            const current = followingFor(d, leagueId);
            const next = current.teams.includes(team)
              ? current.teams.filter((entry) => entry !== team)
              : [...current.teams, team].slice(0, MAX_TEAMS);
            return { ...d, following: { ...d.following, [leagueId]: { ...current, teams: next } } };
          }),
        ),
      toggleTour: (instanceId, leagueId) =>
        set((state) =>
          update(state, instanceId, (d) => {
            const current = followingFor(d, leagueId);
            return {
              ...d,
              following: { ...d.following, [leagueId]: { ...current, tour: !current.tour } },
            };
          }),
        ),
      setStates: (instanceId, states) =>
        set((state) =>
          update(state, instanceId, (d) => ({
            ...d,
            states: states.length > 0 ? states : DEFAULT_STATES,
          })),
        ),
      setWindow: (instanceId, window) =>
        set((state) => update(state, instanceId, (d) => ({ ...d, window }))),
      removeInstance: (instanceId) =>
        set((state) => ({ byInstance: dropInstance(state.byInstance, instanceId) })),
    }),
    {
      name: "widget:sports",
      storage: gatedStorage,
      version: 2,
      onRehydrateStorage: () => () => gatedStorage.open(useSportsStore),
      partialize: (state) => ({ byInstance: state.byInstance }),
      migrate: (persisted, version) => {
        if (version >= 2) return persisted;
        if (!persisted || typeof persisted !== "object") return { byInstance: {} };
        const byInstance = (persisted as { byInstance?: Record<string, unknown> }).byInstance;
        if (!byInstance || typeof byInstance !== "object") return { byInstance: {} };
        return {
          byInstance: Object.fromEntries(
            Object.entries(byInstance).map(([id, data]) => [id, migrateInstance(data)]),
          ),
        };
      },
      merge: (persisted, current) =>
        mergePersisted("widget:sports", persistedSchema, persisted, current, (parsed) => ({
          ...current,
          byInstance: parsed.byInstance,
        })),
    },
  ),
);

registerInstanceCleanup((instanceId) => useSportsStore.getState().removeInstance(instanceId));

export const useSports = createInstanceSelector(useSportsStore, DEFAULT_DATA);

export function useFollowing(leagueId: string): LeagueFollowing {
  return useSports((d) => d.following[leagueId] ?? NO_FOLLOWING);
}
