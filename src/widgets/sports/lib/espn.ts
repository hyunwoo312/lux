import { z } from "zod";
import { ensureOk, withTimeout } from "@/lib/net";
import {
  MATCH_STATES,
  type Match,
  type MatchLeader,
  type MatchState,
  type MatchTeam,
} from "@/widgets/sports/types";

const API_BASE = "https://site.api.espn.com/apis/site/v2/sports";
const CDN_BASE = "https://cdn.espn.com/core";

const athleteSchema = z.object({
  shortName: z.string().optional(),
  displayName: z.string().optional(),
});

const competitorSchema = z.object({
  homeAway: z.enum(["home", "away"]),
  score: z.string().optional(),
  winner: z.boolean().optional(),
  hits: z.number().optional(),
  errors: z.number().optional(),
  records: z.array(z.object({ summary: z.string().optional() })).optional(),
  linescores: z.array(z.object({ displayValue: z.string().optional() })).optional(),
  leaders: z
    .array(
      z.object({
        shortDisplayName: z.string().optional(),
        abbreviation: z.string().optional(),
        leaders: z
          .array(
            z.object({ displayValue: z.string().optional(), athlete: athleteSchema.optional() }),
          )
          .optional(),
      }),
    )
    .optional(),
  probables: z.array(z.object({ athlete: athleteSchema.optional() })).optional(),
  team: z.object({
    abbreviation: z.string().optional(),
    shortDisplayName: z.string().optional(),
    displayName: z.string().optional(),
    logo: z.string().optional(),
  }),
});

const MAX_LEADERS = 3;

function listsSeveralStats(detail: string): boolean {
  return detail.includes(",");
}

function toLeaders(raw: z.infer<typeof competitorSchema>["leaders"]): MatchLeader[] {
  if (!raw) return [];
  const credited = new Set<string>();
  return raw
    .flatMap((group) => {
      const top = group.leaders?.[0];
      const athlete = top?.athlete?.shortName ?? top?.athlete?.displayName;
      if (!top?.displayValue || !athlete || credited.has(athlete)) return [];
      credited.add(athlete);
      return [
        {
          label: listsSeveralStats(top.displayValue)
            ? undefined
            : (group.abbreviation ?? group.shortDisplayName),
          athlete,
          detail: top.displayValue,
        },
      ];
    })
    .slice(0, MAX_LEADERS);
}

const eventSchema = z.object({
  id: z.string(),
  date: z.string(),
  status: z.object({
    type: z.object({
      state: z.enum(MATCH_STATES),
      shortDetail: z.string().optional(),
    }),
  }),
  links: z.array(z.object({ href: z.string().optional() })).optional(),
  competitions: z
    .array(
      z.object({
        competitors: z.array(competitorSchema),
        venue: z.object({ fullName: z.string().optional() }).optional(),
        broadcasts: z.array(z.object({ names: z.array(z.string()).optional() })).optional(),
        situation: z
          .object({
            balls: z.number().optional(),
            strikes: z.number().optional(),
            outs: z.number().optional(),
            onFirst: z.boolean().optional(),
            onSecond: z.boolean().optional(),
            onThird: z.boolean().optional(),
            lastPlay: z.object({ text: z.string().optional() }).optional(),
          })
          .optional(),
      }),
    )
    .nonempty(),
});

const scoreboardSchema = z.object({ events: z.array(z.unknown()).optional() });

function toTeam(competitor: z.infer<typeof competitorSchema>, state: MatchState): MatchTeam {
  const { team } = competitor;
  const parsed = competitor.score != null ? Number(competitor.score) : Number.NaN;
  const probable = competitor.probables?.[0]?.athlete;
  return {
    abbreviation: team.abbreviation ?? team.shortDisplayName ?? "—",
    name: team.shortDisplayName ?? team.displayName ?? team.abbreviation ?? "—",
    score: state === "pre" || Number.isNaN(parsed) ? null : parsed,
    logo: team.logo,
    winner: competitor.winner ?? false,
    record: competitor.records?.[0]?.summary,
    periods:
      state === "pre" ? [] : (competitor.linescores ?? []).map((entry) => entry.displayValue ?? ""),
    hits: competitor.hits,
    errors: competitor.errors,
    leaders: state === "pre" ? [] : toLeaders(competitor.leaders),
    probable: state === "pre" ? (probable?.shortName ?? probable?.displayName) : undefined,
  };
}

type RawSituation = NonNullable<z.infer<typeof eventSchema>["competitions"][number]["situation"]>;

function toSituation(raw: RawSituation | undefined): Match["situation"] {
  if (!raw) return undefined;
  const bases = [raw.onFirst, raw.onSecond, raw.onThird]
    .map((occupied, index) => (occupied ? index + 1 : 0))
    .filter((base) => base > 0);
  const lastPlay = raw.lastPlay?.text;
  const hasCount = raw.balls != null || raw.strikes != null || raw.outs != null;
  if (!hasCount && bases.length === 0 && !lastPlay) return undefined;
  return { balls: raw.balls, strikes: raw.strikes, outs: raw.outs, bases, lastPlay };
}

function toMatch(raw: unknown): Match | null {
  const parsed = eventSchema.safeParse(raw);
  if (!parsed.success) return null;
  const event = parsed.data;
  const competitors = event.competitions[0]?.competitors ?? [];
  const home = competitors.find((entry) => entry.homeAway === "home");
  const away = competitors.find((entry) => entry.homeAway === "away");
  if (!home || !away) return null;

  const state = event.status.type.state;
  const competition = event.competitions[0];
  return {
    id: event.id,
    state,
    detail: event.status.type.shortDetail ?? "",
    startsAt: event.date,
    home: toTeam(home, state),
    away: toTeam(away, state),
    link: event.links?.find((entry) => entry.href)?.href,
    venue: competition?.venue?.fullName,
    broadcast: competition?.broadcasts?.[0]?.names?.[0],
    situation: state === "in" ? toSituation(competition?.situation) : undefined,
  };
}

const STATE_ORDER: Record<MatchState, number> = { in: 0, pre: 1, post: 2 };

function toMatches(events: readonly unknown[]): Match[] {
  return events
    .map(toMatch)
    .filter((match): match is Match => match !== null)
    .sort((a, b) => {
      const byState = STATE_ORDER[a.state] - STATE_ORDER[b.state];
      if (byState !== 0) return byState;
      return Date.parse(a.startsAt) - Date.parse(b.startsAt);
    });
}

export function parseScoreboard(raw: unknown): Match[] {
  const parsed = scoreboardSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Unexpected scoreboard response");
  return toMatches(parsed.data.events ?? []);
}

const mirrorSchema = z.object({
  content: z.object({ sbData: z.object({ events: z.array(z.unknown()) }) }),
});

export function parseMirrorScoreboard(raw: unknown): Match[] {
  const parsed = mirrorSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Unexpected scoreboard response");
  return toMatches(parsed.data.content.sbData.events);
}

export function mirrorUrl(path: string, dates?: string | null): string | null {
  const [sport, league] = path.split("/");
  if (!sport || !league) return null;
  return `${CDN_BASE}/${league}/scoreboard?xhr=1${dates ? `&dates=${dates}` : ""}`;
}

async function fetchMatches(
  url: string,
  parse: (raw: unknown) => Match[],
  signal?: AbortSignal,
): Promise<Match[]> {
  const response = await fetch(url, {
    signal: withTimeout(signal),
  });

  ensureOk(response, "Scores are unavailable right now");

  return parse(await response.json());
}

export async function fetchScoreboard(
  path: string,
  signal?: AbortSignal,
  dates?: string | null,
): Promise<Match[]> {
  const query = dates ? `?dates=${dates}` : "";
  try {
    return await fetchMatches(`${API_BASE}/${path}/scoreboard${query}`, parseScoreboard, signal);
  } catch (error) {
    const mirror = mirrorUrl(path, dates);
    if (!mirror || signal?.aborted) throw error;
    try {
      return await fetchMatches(mirror, parseMirrorScoreboard, signal);
    } catch {
      throw error;
    }
  }
}

const teamsSchema = z.object({
  sports: z
    .array(
      z.object({
        leagues: z
          .array(
            z.object({
              teams: z.array(
                z.object({
                  team: z.object({
                    abbreviation: z.string().optional(),
                    shortDisplayName: z.string().optional(),
                    displayName: z.string().optional(),
                    logos: z.array(z.object({ href: z.string().optional() })).optional(),
                  }),
                }),
              ),
            }),
          )
          .nonempty(),
      }),
    )
    .nonempty(),
});

export type TeamOption = { abbreviation: string; name: string; logo?: string };

export function parseTeams(raw: unknown): TeamOption[] {
  const parsed = teamsSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Unexpected teams response");

  const teams = parsed.data.sports[0]?.leagues[0]?.teams ?? [];

  return teams
    .map(({ team }) => ({
      abbreviation: team.abbreviation ?? "",
      name: team.shortDisplayName ?? team.displayName ?? team.abbreviation ?? "",
      logo: team.logos?.find((entry) => entry.href)?.href,
    }))
    .filter((team) => team.abbreviation !== "")
    .sort((a, b) => a.abbreviation.localeCompare(b.abbreviation));
}

export async function fetchTeams(path: string, signal?: AbortSignal): Promise<TeamOption[]> {
  const response = await fetch(`${API_BASE}/${path}/teams`, {
    signal: withTimeout(signal),
  });

  ensureOk(response, "Teams are unavailable right now");
  return parseTeams(await response.json());
}

export function matchesTeam(match: Match, abbreviation: string): boolean {
  return match.home.abbreviation === abbreviation || match.away.abbreviation === abbreviation;
}

const cachedTeamSchema = z.object({
  abbreviation: z.string(),
  name: z.string(),
  score: z.number().nullable(),
  logo: z.string().optional(),
  winner: z.boolean(),
  record: z.string().optional(),
  periods: z.array(z.string()).catch([]),
  hits: z.number().optional(),
  errors: z.number().optional(),
  leaders: z
    .array(z.object({ label: z.string().optional(), athlete: z.string(), detail: z.string() }))
    .catch([]),
  probable: z.string().optional(),
});

const cachedMatchSchema = z.object({
  id: z.string(),
  state: z.enum(MATCH_STATES),
  detail: z.string(),
  startsAt: z.string(),
  home: cachedTeamSchema,
  away: cachedTeamSchema,
  link: z.string().optional(),
  venue: z.string().optional(),
  broadcast: z.string().optional(),
  situation: z
    .object({
      balls: z.number().optional(),
      strikes: z.number().optional(),
      outs: z.number().optional(),
      bases: z.array(z.number()),
      lastPlay: z.string().optional(),
    })
    .optional(),
});

export function parseCachedScoreboard(raw: unknown): Match[] | null {
  const result = z.array(cachedMatchSchema).safeParse(raw);
  return result.success ? result.data : null;
}
