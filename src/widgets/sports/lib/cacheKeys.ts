import type { League } from "@/widgets/sports/lib/leagues";
import type { DayWindow } from "@/widgets/sports/lib/window";

const SHAPE = 2;

function key(rest: string): string {
  return `sports:v${SHAPE}:${rest}`;
}

export function scoreboardKey(league: League, dayWindow: DayWindow): string {
  return league.kind === "match"
    ? key(`${league.id}:${dayWindow}`)
    : key(`${league.id}:${league.kind}`);
}

export const TEAM_INDEX_KEY = key("team-index");
