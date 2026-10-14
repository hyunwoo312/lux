import { z } from "zod";
import { espnUrl, fetchEspn } from "@/widgets/sports/lib/espnApi";
import {
  statistic,
  player,
  playerGroup,
  team,
  play,
  drive,
  response,
  cachedSummary,
} from "@/widgets/sports/lib/summarySchema";
import { TEAM_STATS, SEASON_STATS } from "@/widgets/sports/lib/summaryStats";
import type { GameSummary, GamePlay } from "@/widgets/sports/types";

function validEntries<T extends z.ZodType>(schema: T, raw: unknown[]): z.output<T>[] {
  return raw.flatMap((entry) => {
    const result = schema.safeParse(entry);
    return result.success ? [result.data] : [];
  });
}

function toPlay(entry: z.infer<typeof play>, scoringIds?: ReadonlySet<string>): GamePlay {
  return {
    id: entry.id,
    text: entry.text.slice(0, 1200),
    period: entry.period.number,
    clock: entry.clock.displayValue,
    homeScore: entry.homeScore,
    awayScore: entry.awayScore,
    scoring: entry.scoringPlay || Boolean(scoringIds?.has(entry.id)),
    teamId: entry.team?.id,
  };
}

export function parseGameSummary(
  raw: unknown,
  leagueId: string,
  awayId?: string,
  homeId?: string,
): GameSummary {
  const parsed = response.safeParse(raw);
  if (!parsed.success) throw new Error("Unexpected game detail response");
  const data = parsed.data;
  const context = data.header.competitions[0]!.status.type.state === "pre" ? "season" : "game";
  const teams = validEntries(
    z.object({ team, statistics: z.array(z.unknown()).catch([]) }),
    data.boxscore?.teams ?? [],
  );
  const statisticsFor = (id?: string) =>
    new Map(
      validEntries(statistic, teams.find((entry) => entry.team.id === id)?.statistics ?? []).map(
        (entry) => [entry.name, entry.displayValue],
      ),
    );
  const away = statisticsFor(awayId),
    home = statisticsFor(homeId);
  const stats =
    (context === "season" ? SEASON_STATS : TEAM_STATS)[leagueId]?.flatMap(([key, label]) => {
      const a = away.get(key),
        h = home.get(key);
      if (a == null || h == null) return [];
      const isPercent = key.endsWith("Pct");
      const value = (text: string) =>
        text.trim().length > 0 && Number.isFinite(Number(text)) && Number(text) >= 0
          ? Number(text)
          : undefined;
      return [
        {
          key,
          label,
          away: a + (isPercent ? "%" : ""),
          home: h + (isPercent ? "%" : ""),
          awayValue: value(a),
          homeValue: value(h),
        },
      ];
    }) ?? [];
  const players =
    context === "season"
      ? []
      : validEntries(
          z.object({ team, statistics: z.array(z.unknown()).catch([]) }),
          data.boxscore?.players ?? [],
        )
          .flatMap((entry) =>
            validEntries(playerGroup, entry.statistics)
              .slice(0, 8)
              .map((group, index) => ({
                id: `${entry.team.id}:${group.name ?? index}`,
                teamId: entry.team.id,
                team: entry.team.abbreviation,
                category: group.name
                  ? group.name.replaceAll(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())
                  : "Players",
                columns: group.keys
                  .slice(0, 40)
                  .map((key, i) => ({ key, label: group.labels[i] ?? key })),
                players: validEntries(player, group.athletes)
                  .slice(0, 60)
                  .map((p) => ({
                    id: p.athlete.id,
                    name: p.athlete.displayName,
                    starter: p.starter,
                    unavailable: p.didNotPlay ? p.reason || "Did not play" : undefined,
                    values: Object.fromEntries(
                      group.keys
                        .slice(0, 40)
                        .flatMap((key, i) => (p.stats[i] == null ? [] : [[key, p.stats[i]!]])),
                    ),
                  })),
              })),
          )
          .filter((group) => group.players.length > 0 && group.columns.length > 0);
  const scoringIds = new Set(validEntries(play, data.scoringPlays).map((play) => play.id));
  const drives =
    context === "season"
      ? []
      : validEntries(drive, [
          ...(data.drives?.previous ?? []),
          ...(data.drives?.current ? [data.drives.current] : []),
        ])
          .slice(0, 100)
          .map((entry) => ({
            id: entry.id,
            result: entry.displayResult,
            description: entry.description,
            teamId: entry.team?.id,
            plays: validEntries(play, entry.plays)
              .slice(-100)
              .map((entry) => toPlay(entry, scoringIds)),
          }));
  const rawPlays =
    context === "season"
      ? []
      : validEntries(play, [
          ...data.plays,
          ...data.scoringPlays,
          ...validEntries(drive, data.drives?.previous ?? []).flatMap((entry) => entry.plays),
          ...validEntries(drive, data.drives?.current ? [data.drives.current] : []).flatMap(
            (entry) => entry.plays,
          ),
        ]);
  const plays = [...new Map(rawPlays.map((entry) => [entry.id, entry])).values()]
    .sort((a, b) => Number(a.sequenceNumber ?? 0) - Number(b.sequenceNumber ?? 0))
    .slice(-1500)
    .map((entry) => toPlay(entry, scoringIds));
  return { eventId: data.header.id, context, stats, players, plays, drives };
}

export function parseCachedGameSummary(raw: unknown): GameSummary | null {
  const result = cachedSummary.safeParse(raw);
  return result.success ? result.data : null;
}

export async function fetchGameSummary(
  path: string,
  eventId: string,
  awayId?: string,
  homeId?: string,
  signal?: AbortSignal,
): Promise<GameSummary> {
  const data = parseGameSummary(
    await fetchEspn(
      espnUrl(path, "summary", `?event=${encodeURIComponent(eventId)}`),
      "Game details are unavailable right now",
      signal,
    ),
    path.split("/")[1] ?? "",
    awayId,
    homeId,
  );
  if (data.eventId !== eventId) throw new Error("Unexpected game detail response");
  return data;
}
