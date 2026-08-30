import type { PolledDefinition } from "@/widgets/core/usePolledResource";
import { scoreboardKey, TEAM_INDEX_KEY } from "@/widgets/sports/lib/cacheKeys";
import { fetchScoreboard, parseCachedScoreboard } from "@/widgets/sports/lib/espn";
import type { League } from "@/widgets/sports/lib/leagues";
import {
  fetchTeamIndex,
  parseCachedTeamIndex,
  type IndexedTeam,
} from "@/widgets/sports/lib/teamIndex";
import { datesParam, type DayWindow } from "@/widgets/sports/lib/window";
import type { Match } from "@/widgets/sports/types";

const SCOREBOARD_INTERVAL_MS = 60_000;
const INDEX_REFRESH_MS = 24 * 60 * 60 * 1000;

export function sportsScoreboard(league: League, dayWindow: DayWindow): PolledDefinition<Match[]> {
  return {
    cacheKey: scoreboardKey(league, dayWindow),
    intervalMs: SCOREBOARD_INTERVAL_MS,
    parse: parseCachedScoreboard,
    fetch: (signal) => fetchScoreboard(league.path, signal, datesParam(dayWindow, new Date())),
  };
}

export const sportsTeamIndex: PolledDefinition<IndexedTeam[]> = {
  cacheKey: TEAM_INDEX_KEY,
  intervalMs: INDEX_REFRESH_MS,
  parse: parseCachedTeamIndex,
  fetch: fetchTeamIndex,
};
