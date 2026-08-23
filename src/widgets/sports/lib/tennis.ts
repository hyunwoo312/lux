import { z } from "zod";
import { espnUrl, fetchEspn } from "@/widgets/sports/lib/espnApi";
import { pickEventIndex } from "@/widgets/sports/lib/pickEvent";
import { MATCH_STATES, type MatchState } from "@/widgets/sports/types";

export type TennisSet = { games: string; won: boolean; tiebreak?: number };

export type TennisPlayer = {
  name: string;
  flag?: string;
  link?: string;
  sets: TennisSet[];
  winner: boolean;
};

export type TennisMatch = {
  id: string;
  state: MatchState;
  detail: string;
  round?: string;
  startsAt: string;
  court?: string;
  venue?: string;
  broadcast?: string;
  bestOf?: number;
  summary?: string;
  away: TennisPlayer;
  home: TennisPlayer;
};

export type TennisDraw = {
  id: string;
  label: string;
  matches: TennisMatch[];
};

export type TennisEvent = {
  name: string;
  state: MatchState;
  detail: string;
  venue?: string;
  dates?: string;
  draws: TennisDraw[];
  link?: string;
};

const competitorSchema = z.object({
  homeAway: z.enum(["home", "away"]).optional(),
  winner: z.boolean().optional(),
  athlete: z
    .object({
      shortName: z.string().optional(),
      displayName: z.string().optional(),
      flag: z.object({ href: z.string().optional() }).optional(),
      links: z.array(z.object({ href: z.string().optional() })).optional(),
    })
    .optional(),
  linescores: z
    .array(
      z.object({
        value: z.number().optional(),
        winner: z.boolean().optional(),
        tiebreak: z.number().optional(),
      }),
    )
    .optional(),
});

const competitionSchema = z.object({
  id: z.string(),
  date: z.string().optional(),
  round: z.object({ displayName: z.string().optional() }).optional(),
  status: z
    .object({
      type: z.object({
        state: z.enum(MATCH_STATES).optional(),
        shortDetail: z.string().optional(),
      }),
    })
    .optional(),
  competitors: z.array(competitorSchema),
  venue: z.object({ fullName: z.string().optional(), court: z.string().optional() }).optional(),
  broadcasts: z.array(z.object({ names: z.array(z.string()).optional() })).optional(),
  format: z
    .object({ regulation: z.object({ periods: z.number().optional() }).optional() })
    .optional(),
  notes: z.array(z.object({ text: z.string().optional() })).optional(),
});

const eventSchema = z.object({
  name: z.string().optional(),
  shortName: z.string().optional(),
  date: z.string().optional(),
  endDate: z.string().optional(),
  venue: z.object({ displayName: z.string().optional() }).optional(),
  status: z.object({
    type: z.object({ state: z.enum(MATCH_STATES), detail: z.string().optional() }),
  }),
  links: z.array(z.object({ href: z.string().optional() })).optional(),
  groupings: z
    .array(
      z.object({
        grouping: z.object({ id: z.string(), displayName: z.string().optional() }),
        competitions: z.array(z.unknown()),
      }),
    )
    .optional(),
});

const boardSchema = z.object({ events: z.array(z.unknown()).optional() });

function toPlayer(raw: z.infer<typeof competitorSchema>): TennisPlayer {
  const athlete = raw.athlete;
  return {
    name: athlete?.shortName ?? athlete?.displayName ?? "—",
    ...(athlete?.flag?.href ? { flag: athlete.flag.href } : {}),
    ...(athlete?.links?.find((entry) => entry.href)?.href
      ? { link: athlete.links.find((entry) => entry.href)?.href as string }
      : {}),
    sets: (raw.linescores ?? []).map((entry) => ({
      games: `${entry.value ?? ""}`,
      won: entry.winner ?? false,
      ...(entry.tiebreak !== undefined ? { tiebreak: entry.tiebreak } : {}),
    })),
    winner: raw.winner ?? false,
  };
}

function toMatch(raw: unknown): TennisMatch | null {
  const parsed = competitionSchema.safeParse(raw);
  if (!parsed.success) return null;

  const competition = parsed.data;
  const home = competition.competitors.find((entry) => entry.homeAway === "home");
  const away = competition.competitors.find((entry) => entry.homeAway === "away");
  if (!home || !away) return null;

  const round = competition.round?.displayName;
  const court = competition.venue?.court;
  const venue = competition.venue?.fullName;
  const broadcast = competition.broadcasts?.find((entry) => entry.names?.[0])?.names?.[0];
  const bestOf = competition.format?.regulation?.periods;
  const summary = competition.notes?.find((entry) => entry.text)?.text;

  return {
    id: competition.id,
    state: competition.status?.type?.state ?? "pre",
    detail: competition.status?.type?.shortDetail ?? "",
    ...(round ? { round } : {}),
    startsAt: competition.date ?? "",
    ...(court ? { court } : {}),
    ...(venue ? { venue } : {}),
    ...(broadcast ? { broadcast } : {}),
    ...(bestOf ? { bestOf } : {}),
    ...(summary ? { summary } : {}),
    away: toPlayer(away),
    home: toPlayer(home),
  };
}

const DAY: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

function playedOver(from: string | undefined, to: string | undefined): string | undefined {
  if (!from || !to) return undefined;
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return undefined;
  const first = start.toLocaleDateString(undefined, DAY);
  const last = end.toLocaleDateString(undefined, DAY);
  return first === last ? first : `${first} – ${last}`;
}

const STATE_ORDER: Record<MatchState, number> = { in: 0, pre: 1, post: 2 };

export function parseTennis(raw: unknown): TennisEvent | null {
  const board = boardSchema.safeParse(raw);
  if (!board.success) throw new Error("Unexpected tennis response");

  const events = board.data.events ?? [];
  if (events.length === 0) return null;

  const readable = events.flatMap((entry) => {
    const parsed = eventSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
  if (readable.length === 0) throw new Error("Unexpected tennis response");

  const candidates = readable.filter((entry) => (entry.groupings?.length ?? 0) > 0);
  if (candidates.length === 0) return null;

  const event =
    candidates[
      pickEventIndex(
        candidates.map((entry) => ({ state: entry.status.type.state, startsAt: entry.date })),
      )
    ];
  if (!event) return null;

  const draws = (event.groupings ?? []).flatMap((grouping) => {
    const matches = grouping.competitions
      .map(toMatch)
      .filter((match): match is TennisMatch => match !== null)
      .sort((a, b) => {
        const byState = STATE_ORDER[a.state] - STATE_ORDER[b.state];
        return byState !== 0 ? byState : Date.parse(b.startsAt) - Date.parse(a.startsAt);
      });
    if (matches.length === 0) return [];
    return [
      {
        id: grouping.grouping.id,
        label: grouping.grouping.displayName ?? "Draw",
        matches,
      },
    ];
  });

  if (draws.length === 0) return null;

  const dates = playedOver(event.date, event.endDate);
  return {
    name: event.shortName ?? event.name ?? "Tournament",
    state: event.status.type.state,
    detail: event.status.type.detail ?? "",
    ...(event.venue?.displayName ? { venue: event.venue.displayName } : {}),
    ...(dates ? { dates } : {}),
    draws,
    ...(event.links?.find((entry) => entry.href)?.href
      ? { link: event.links.find((entry) => entry.href)?.href }
      : {}),
  };
}

export function hasTennisDetail(match: TennisMatch): boolean {
  return Boolean(
    match.summary ||
    match.bestOf ||
    match.court ||
    match.venue ||
    match.broadcast ||
    match.home.sets.length > 0 ||
    match.home.link ||
    match.away.link,
  );
}

const cachedPlayerSchema = z.object({
  name: z.string(),
  flag: z.string().optional(),
  link: z.string().optional(),
  sets: z
    .array(
      z.object({
        games: z.string(),
        won: z.boolean(),
        tiebreak: z.number().optional(),
      }),
    )
    .catch([]),
  winner: z.boolean(),
});

const cachedSchema = z.object({
  name: z.string(),
  state: z.enum(MATCH_STATES),
  detail: z.string(),
  venue: z.string().optional(),
  dates: z.string().optional(),
  link: z.string().optional(),
  draws: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      matches: z.array(
        z.object({
          id: z.string(),
          state: z.enum(MATCH_STATES),
          detail: z.string(),
          round: z.string().optional(),
          startsAt: z.string(),
          court: z.string().optional(),
          venue: z.string().optional(),
          broadcast: z.string().optional(),
          bestOf: z.number().optional(),
          summary: z.string().optional(),
          away: cachedPlayerSchema,
          home: cachedPlayerSchema,
        }),
      ),
    }),
  ),
});

export function parseCachedTennis(raw: unknown): TennisEvent | null {
  const result = cachedSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export async function fetchTennis(path: string, signal?: AbortSignal): Promise<TennisEvent | null> {
  const raw = await fetchEspn(
    espnUrl(path, "scoreboard"),
    "Tennis results are unavailable right now",
    signal,
  );
  return parseTennis(raw);
}
