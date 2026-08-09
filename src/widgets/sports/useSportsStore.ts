import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import { registerInstanceCleanup } from "@/widgets/core/instanceCleanup";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
import { DEFAULT_LEAGUE_ID, LEAGUES } from "@/widgets/sports/lib/leagues";
import { DAY_WINDOWS, DEFAULT_DAY_WINDOW, type DayWindow } from "@/widgets/sports/lib/window";
import { MATCH_STATES, type MatchState } from "@/widgets/sports/types";

type SportsData = {
  leagueId: string;
  teams: string[];
  states: MatchState[];
  window: DayWindow;
};

type SportsState = {
  byInstance: Record<string, SportsData>;
  setLeague: (instanceId: string, leagueId: string) => void;
  setTeams: (instanceId: string, teams: string[]) => void;
  setStates: (instanceId: string, states: MatchState[]) => void;
  setWindow: (instanceId: string, window: DayWindow) => void;
  removeInstance: (instanceId: string) => void;
};

const DEFAULT_STATES: MatchState[] = [...MATCH_STATES];

const DEFAULT_DATA: SportsData = {
  leagueId: DEFAULT_LEAGUE_ID,
  teams: [],
  states: DEFAULT_STATES,
  window: DEFAULT_DAY_WINDOW,
};

export const MAX_TEAMS = 6;

export const SPORTS_SYNC_COOLDOWN_MS = 30_000;

const LEAGUE_IDS = LEAGUES.map((league) => league.id);

const dataSchema = z.object({
  leagueId: z
    .string()
    .refine((id) => LEAGUE_IDS.includes(id))
    .catch(DEFAULT_LEAGUE_ID),
  teams: z.array(z.string()).max(MAX_TEAMS).catch([]),
  states: z
    .array(z.enum(MATCH_STATES))
    .nonempty()
    .catch(() => [...DEFAULT_STATES] as [MatchState, ...MatchState[]]),
  window: z.enum(DAY_WINDOWS).catch(DEFAULT_DAY_WINDOW),
});

const persistedSchema = z.object({ byInstance: z.record(z.string(), dataSchema) });

const gatedStorage = createGatedChromeStorage();

export const useSportsStore = create<SportsState>()(
  persist(
    (set) => ({
      byInstance: {},
      setLeague: (instanceId, leagueId) =>
        set((state) => ({
          byInstance: patchInstance(state.byInstance, instanceId, DEFAULT_DATA, (data) => ({
            ...data,
            leagueId,
            teams: data.leagueId === leagueId ? data.teams : [],
          })),
        })),
      setTeams: (instanceId, teams) =>
        set((state) => ({
          byInstance: patchInstance(state.byInstance, instanceId, DEFAULT_DATA, (data) => ({
            ...data,
            teams: teams.slice(0, MAX_TEAMS),
          })),
        })),
      setStates: (instanceId, states) =>
        set((state) => ({
          byInstance: patchInstance(state.byInstance, instanceId, DEFAULT_DATA, (data) => ({
            ...data,
            states: states.length > 0 ? states : DEFAULT_STATES,
          })),
        })),
      setWindow: (instanceId, window) =>
        set((state) => ({
          byInstance: patchInstance(state.byInstance, instanceId, DEFAULT_DATA, (data) => ({
            ...data,
            window,
          })),
        })),
      removeInstance: (instanceId) =>
        set((state) => ({ byInstance: dropInstance(state.byInstance, instanceId) })),
    }),
    {
      name: "widget:sports",
      storage: gatedStorage,
      version: 1,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({ byInstance: state.byInstance }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        return parsed.success ? { ...current, byInstance: parsed.data.byInstance } : current;
      },
    },
  ),
);

registerInstanceCleanup((instanceId) => useSportsStore.getState().removeInstance(instanceId));

export const useSports = createInstanceSelector(useSportsStore, DEFAULT_DATA);
