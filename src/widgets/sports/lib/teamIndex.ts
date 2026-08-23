import { z } from "zod";
import { fetchTeams, type TeamOption } from "@/widgets/sports/lib/espn";
import { LEAGUES, type League } from "@/widgets/sports/lib/leagues";

export type IndexedTeam = {
  leagueId: string;
  abbreviation: string;
  name: string;
  logo?: string;
};

const cachedSchema = z.array(
  z.object({
    leagueId: z.string(),
    abbreviation: z.string(),
    name: z.string(),
    logo: z.string().optional(),
  }),
);

export function parseCachedTeamIndex(raw: unknown): IndexedTeam[] | null {
  const result = cachedSchema.safeParse(raw);
  return result.success ? result.data : null;
}

function toIndexed(league: League, teams: TeamOption[]): IndexedTeam[] {
  return teams.map((team) => ({
    leagueId: league.id,
    abbreviation: team.abbreviation,
    name: team.name,
    ...(team.logo ? { logo: team.logo } : {}),
  }));
}

export async function fetchTeamIndex(signal?: AbortSignal): Promise<IndexedTeam[]> {
  const leagues = LEAGUES.filter((league) => league.kind === "match");
  const lists = await Promise.all(
    leagues.map((league) =>
      fetchTeams(league.path, signal)
        .then((teams) => toIndexed(league, teams))
        .catch(() => []),
    ),
  );
  return lists.flat();
}

export function searchTours(query: string): League[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [];

  return LEAGUES.filter((league) => league.kind !== "match").filter(
    (league) =>
      league.label.toLowerCase().includes(needle) || league.id.toLowerCase().startsWith(needle),
  );
}

export function searchTeamIndex(teams: IndexedTeam[], query: string, limit: number): IndexedTeam[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [];

  const scored = teams.flatMap((team) => {
    const abbreviation = team.abbreviation.toLowerCase();
    const name = team.name.toLowerCase();
    if (abbreviation === needle) return [{ team, rank: 0 }];
    if (name.startsWith(needle)) return [{ team, rank: 1 }];
    if (abbreviation.startsWith(needle)) return [{ team, rank: 2 }];
    if (name.includes(needle)) return [{ team, rank: 3 }];
    return [];
  });

  return scored
    .sort((a, b) => a.rank - b.rank || a.team.name.localeCompare(b.team.name))
    .slice(0, limit)
    .map((entry) => entry.team);
}
