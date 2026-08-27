import { z } from "zod";
import { espnUrl, fetchEspn } from "@/widgets/sports/lib/espnApi";
import { pickEventIndex } from "@/widgets/sports/lib/pickEvent";
import { MATCH_STATES, type MatchState } from "@/widgets/sports/types";

export type GolfRound = { round: number; toPar: string; strokes: string };

export type ScoreCounts = {
  eagles: number;
  birdies: number;
  pars: number;
  bogeys: number;
  worse: number;
};

export type LeaderboardPlayer = {
  id: string;
  name: string;
  flag?: string;
  score: string;
  position: string;
  today?: string;
  card: GolfRound[];
  scoring?: ScoreCounts;
  madeCut: boolean;
};

export type Leaderboard = {
  name: string;
  state: MatchState;
  detail: string;
  dates?: string;
  players: LeaderboardPlayer[];
  link?: string;
};

const competitorSchema = z.object({
  id: z.string(),
  order: z.number().optional(),
  athlete: z
    .object({
      shortName: z.string().optional(),
      displayName: z.string().optional(),
      fullName: z.string().optional(),
      flag: z.object({ href: z.string().optional() }).optional(),
    })
    .optional(),
  score: z.string().optional(),
  linescores: z
    .array(
      z.object({
        displayValue: z.string().optional(),
        value: z.number().optional(),
        period: z.number().optional(),
        linescores: z
          .array(
            z.object({ scoreType: z.object({ displayValue: z.string().optional() }).optional() }),
          )
          .optional(),
      }),
    )
    .optional(),
});

function countScores(
  rounds: NonNullable<z.infer<typeof competitorSchema>["linescores"]>,
): ScoreCounts | undefined {
  const counts: ScoreCounts = { eagles: 0, birdies: 0, pars: 0, bogeys: 0, worse: 0 };
  let seen = 0;

  for (const round of rounds) {
    for (const hole of round.linescores ?? []) {
      const relative = Number(hole.scoreType?.displayValue);
      const par = hole.scoreType?.displayValue === "E";
      if (!par && !Number.isFinite(relative)) continue;
      seen += 1;
      if (par || relative === 0) counts.pars += 1;
      else if (relative <= -2) counts.eagles += 1;
      else if (relative === -1) counts.birdies += 1;
      else if (relative === 1) counts.bogeys += 1;
      else counts.worse += 1;
    }
  }

  return seen > 0 ? counts : undefined;
}

const eventSchema = z.object({
  name: z.string().optional(),
  shortName: z.string().optional(),
  date: z.string().optional(),
  endDate: z.string().optional(),
  status: z.object({ type: z.object({ state: z.enum(MATCH_STATES) }) }),
  links: z.array(z.object({ href: z.string().optional() })).optional(),
  competitions: z
    .array(
      z.object({
        status: z
          .object({
            period: z.number().optional(),
            type: z.object({ detail: z.string().optional() }).optional(),
          })
          .optional(),
        competitors: z.array(competitorSchema),
      }),
    )
    .nonempty(),
});

const boardSchema = z.object({ events: z.array(z.unknown()).optional() });

function positionsFor(players: readonly { score: string; madeCut: boolean }[]): string[] {
  const positions = players.map(() => "");
  const ranked = players.flatMap((player, index) =>
    player.madeCut ? [{ index, score: player.score }] : [],
  );

  let start = 0;
  while (start < ranked.length) {
    const score = ranked[start]?.score;
    let end = start;
    while (end < ranked.length && ranked[end]?.score === score) end += 1;
    const label = `${end - start > 1 ? "T" : ""}${start + 1}`;
    for (let index = start; index < end; index += 1) {
      const entry = ranked[index];
      if (entry) positions[entry.index] = label;
    }
    start = end;
  }

  return positions;
}

const DAY: Intl.DateTimeFormatOptions = { weekday: "short" };

function playedOver(from: string | undefined, to: string | undefined): string | undefined {
  if (!from || !to) return undefined;
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return undefined;
  const first = start.toLocaleDateString(undefined, DAY);
  const last = end.toLocaleDateString(undefined, DAY);
  return first === last ? first : `${first}–${last}`;
}

export function parseLeaderboard(raw: unknown): Leaderboard | null {
  const board = boardSchema.safeParse(raw);
  if (!board.success) throw new Error("Unexpected leaderboard response");

  const events = board.data.events ?? [];
  if (events.length === 0) return null;

  const candidates = events.flatMap((entry) => {
    const parsed = eventSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
  if (candidates.length === 0) throw new Error("Unexpected leaderboard response");

  const tournament =
    candidates[
      pickEventIndex(
        candidates.map((entry) => ({ state: entry.status.type.state, startsAt: entry.date })),
      )
    ];
  if (!tournament) return null;

  const competition = tournament.competitions[0];
  if (!competition) return null;

  const state = tournament.status.type.state;
  const round = competition.status?.period ?? 1;

  const entries = [...competition.competitors]
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
    .map((competitor) => {
      const raw = competitor.linescores ?? [];
      const card = raw.map((entry, index) => ({
        round: entry.period ?? index + 1,
        toPar: entry.displayValue ?? "",
        strokes: entry.value !== undefined ? `${entry.value}` : "",
      }));
      const scoring = countScores(raw);
      const athlete = competitor.athlete;
      return {
        id: competitor.id,
        name: athlete?.shortName ?? athlete?.displayName ?? athlete?.fullName ?? "—",
        flag: athlete?.flag?.href,
        score: competitor.score ?? "—",
        today: card.at(-1)?.toPar,
        card,
        scoring,
        madeCut: state !== "post" || card.length >= round,
      };
    });

  const positions = positionsFor(entries);

  const dates = playedOver(tournament.date, tournament.endDate);
  return {
    name: tournament.shortName ?? tournament.name ?? "Tournament",
    state,
    dates,
    detail: competition.status?.type?.detail ?? (state === "post" ? "Final" : `Round ${round}`),
    players: entries.map((entry, index) => ({ ...entry, position: positions[index] ?? "" })),
    link: tournament.links?.find((entry) => entry.href)?.href,
  };
}

const cachedSchema = z.object({
  name: z.string(),
  state: z.enum(MATCH_STATES),
  detail: z.string(),
  dates: z.string().optional(),
  players: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        flag: z.string().optional(),
        score: z.string(),
        position: z.string(),
        today: z.string().optional(),
        card: z
          .array(z.object({ round: z.number(), toPar: z.string(), strokes: z.string() }))
          .catch([]),
        scoring: z
          .object({
            eagles: z.number(),
            birdies: z.number(),
            pars: z.number(),
            bogeys: z.number(),
            worse: z.number(),
          })
          .optional(),
        madeCut: z.boolean(),
      }),
    )
    .catch([]),
  link: z.string().optional(),
});

export function hasPlayerDetail(player: LeaderboardPlayer): boolean {
  return player.card.length > 0 || player.scoring !== undefined;
}

export function parseCachedLeaderboard(raw: unknown): Leaderboard | null {
  const result = cachedSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export async function fetchLeaderboard(
  path: string,
  signal?: AbortSignal,
): Promise<Leaderboard | null> {
  const raw = await fetchEspn(
    espnUrl(path, "scoreboard"),
    "The leaderboard is unavailable right now",
    signal,
  );
  return parseLeaderboard(raw);
}
