import type { PolledDefinition } from "@/widgets/core/usePolledResource";
import { scoreboardKey, TEAM_INDEX_KEY } from "@/widgets/sports/lib/cacheKeys";
import { fetchScoreboard, parseCachedScoreboard } from "@/widgets/sports/lib/espn";
import {
  fetchLeaderboard,
  parseCachedLeaderboard,
  type Leaderboard,
} from "@/widgets/sports/lib/golf";
import type { League } from "@/widgets/sports/lib/leagues";
import { fetchTennis, parseCachedTennis, type TennisEvent } from "@/widgets/sports/lib/tennis";
import {
  fetchTeamIndex,
  parseCachedTeamIndex,
  type IndexedTeam,
} from "@/widgets/sports/lib/teamIndex";
import { datesParam, DEFAULT_DAY_WINDOW, type DayWindow } from "@/widgets/sports/lib/window";
import type { Match } from "@/widgets/sports/types";

const SCOREBOARD_INTERVAL_MS = 60_000;
const INDEX_REFRESH_MS = 24 * 60 * 60 * 1000;

export function sportsScoreboard(league: League, dayWindow: DayWindow): PolledDefinition<Match[]> {
  return {
    widget: "sports",
    cacheKey: scoreboardKey(league, dayWindow),
    intervalMs: SCOREBOARD_INTERVAL_MS,
    parse: parseCachedScoreboard,
    fetch: (signal) => fetchScoreboard(league.path, signal, datesParam(dayWindow, new Date())),
  };
}

export function sportsLeaderboard(league: League): PolledDefinition<Leaderboard | null> {
  return {
    widget: "sports",
    cacheKey: scoreboardKey(league, DEFAULT_DAY_WINDOW),
    intervalMs: SCOREBOARD_INTERVAL_MS,
    parse: parseCachedLeaderboard,
    fetch: (signal) => fetchLeaderboard(league.path, signal),
  };
}

export function sportsTennis(league: League): PolledDefinition<TennisEvent | null> {
  return {
    widget: "sports",
    cacheKey: scoreboardKey(league, DEFAULT_DAY_WINDOW),
    intervalMs: SCOREBOARD_INTERVAL_MS,
    parse: parseCachedTennis,
    fetch: (signal) => fetchTennis(league.path, signal),
  };
}

export const sportsTeamIndex: PolledDefinition<IndexedTeam[]> = {
  widget: "sports",
  cacheKey: TEAM_INDEX_KEY,
  intervalMs: INDEX_REFRESH_MS,
  parse: parseCachedTeamIndex,
  fetch: fetchTeamIndex,
};
