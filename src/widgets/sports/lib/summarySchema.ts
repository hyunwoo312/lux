import { z } from "zod";

export const statistic = z.object({ name: z.string(), displayValue: z.string() });
const athlete = z.object({
  id: z.string(),
  displayName: z.string(),
  shortName: z.string().optional(),
});
export const player = z.object({
  athlete,
  stats: z.array(z.string()).catch([]),
  starter: z.boolean().catch(false),
  didNotPlay: z.boolean().catch(false),
  reason: z.string().optional().catch(undefined),
});
export const playerGroup = z.object({
  name: z.string().optional(),
  keys: z.array(z.string()).catch([]),
  labels: z.array(z.string()).catch([]),
  athletes: z.array(z.unknown()).catch([]),
});
export const team = z.object({ id: z.string(), abbreviation: z.string() });
export const play = z.object({
  id: z.string(),
  text: z.string(),
  sequenceNumber: z.union([z.string(), z.number()]).optional(),
  period: z.object({ number: z.number().int().positive() }),
  clock: z.object({ displayValue: z.string() }),
  homeScore: z.number().finite().optional(),
  awayScore: z.number().finite().optional(),
  scoringPlay: z.boolean().catch(false),
  team: z.object({ id: z.string() }).optional().catch(undefined),
});
export const drive = z.object({
  id: z.string(),
  description: z.string().catch(""),
  displayResult: z.string().catch("Drive"),
  team: z.object({ id: z.string() }).optional().catch(undefined),
  plays: z.array(z.unknown()).catch([]),
});

export const response = z.object({
  header: z.object({
    id: z.string(),
    competitions: z
      .array(
        z.object({
          status: z.object({ type: z.object({ state: z.enum(["pre", "in", "post"]) }) }),
        }),
      )
      .nonempty(),
  }),
  boxscore: z
    .object({
      teams: z.array(z.unknown()).catch([]),
      players: z.array(z.unknown()).catch([]),
    })
    .optional()
    .catch(undefined),
  plays: z.array(z.unknown()).catch([]),
  scoringPlays: z.array(z.unknown()).catch([]),
  drives: z
    .object({ previous: z.array(z.unknown()).catch([]), current: z.unknown().optional() })
    .optional()
    .catch(undefined),
});

const cachedPlay = z.object({
  id: z.string(),
  text: z.string(),
  period: z.number(),
  clock: z.string(),
  awayScore: z.number().optional(),
  homeScore: z.number().optional(),
  scoring: z.boolean(),
  teamId: z.string().optional(),
});
export const cachedSummary = z.object({
  eventId: z.string(),
  context: z.enum(["season", "game"]),
  stats: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        away: z.string(),
        home: z.string(),
        awayValue: z.number().optional(),
        homeValue: z.number().optional(),
      }),
    )
    .catch([]),
  players: z
    .array(
      z.object({
        id: z.string(),
        teamId: z.string(),
        team: z.string(),
        category: z.string(),
        columns: z.array(z.object({ key: z.string(), label: z.string() })),
        players: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            starter: z.boolean(),
            unavailable: z.string().optional(),
            values: z.record(z.string(), z.string()),
          }),
        ),
      }),
    )
    .catch([]),
  plays: z.array(cachedPlay).catch([]),
  drives: z
    .array(
      z.object({
        id: z.string(),
        result: z.string(),
        description: z.string(),
        teamId: z.string().optional(),
        plays: z.array(cachedPlay),
      }),
    )
    .catch([]),
});
