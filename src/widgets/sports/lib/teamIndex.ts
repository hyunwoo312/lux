import { z } from "zod";
import { fetchTeams, type TeamOption } from "@/widgets/sports/lib/espn";
import { LEAGUES, type League } from "@/widgets/sports/lib/leagues";
import { matchesQuery } from "@/lib/utils";
import { readPolled } from "@/widgets/core/usePolledResource";

export type IndexedTeam = {
  leagueId: string;
  abbreviation: string;
  name: string;
  logo?: string;
};

const teamsSchema = z.array(
  z.object({
    leagueId: z.string(),
    abbreviation: z.string(),
    name: z.string(),
    logo: z.string().optional(),
  }),
);

export type TeamIndex = { teams: IndexedTeam[]; missing: string[] };

const cachedSchema = z.object({ teams: teamsSchema, missing: z.array(z.string()) });

export function parseCachedTeamIndex(raw: unknown): TeamIndex | null {
  const result = cachedSchema.safeParse(raw);
  return result.success ? result.data : null;
}

function toIndexed(league: League, teams: TeamOption[]): IndexedTeam[] {
  return teams.map((team) => ({
    leagueId: league.id,
    abbreviation: team.abbreviation,
    name: team.name,
    logo: team.logo,
  }));
}

export async function fetchTeamIndex(signal?: AbortSignal): Promise<TeamIndex> {
  const leagues = LEAGUES.filter((league) => league.kind === "match");
  const results = await Promise.allSettled(
    leagues.map((league) =>
      readPolled<IndexedTeam[]>({
        widget: "sports",
        cacheKey: `sports:teams:v2:${league.id}`,
        intervalMs: 24 * 60 * 60 * 1000,
        parse: (raw) => {
          const result = teamsSchema.safeParse(raw);
          return result.success ? result.data : null;
        },
        fetch: async (requestSignal) =>
          toIndexed(league, await fetchTeams(league.path, requestSignal)),
      }),
    ),
  );
  signal?.throwIfAborted();
  const teams = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  if (results.every((result) => result.status === "rejected")) {
    const first = results[0];
    throw first?.status === "rejected" && first.reason instanceof Error
      ? first.reason
      : new Error("Teams are unavailable right now");
  }
  return {
    teams,
    missing: leagues
      .filter((_, index) => results[index]?.status === "rejected")
      .map((league) => league.id),
  };
}

export function searchTours(query: string): League[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [];

  return LEAGUES.filter((league) => league.kind !== "match").filter(
    (league) => matchesQuery(league.label, needle) || league.id.toLowerCase().startsWith(needle),
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
