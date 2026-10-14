import { useState } from "react";
import { ConfigSegmented } from "@/components/config/Config";
import { MatchStats } from "@/widgets/sports/components/match/MatchStats";
import { GamePlayers } from "@/widgets/sports/components/match/GamePlayers";
import type { GameSummary } from "@/widgets/sports/types";
import type { Match } from "@/widgets/sports/types";

export function GameStats({ match, summary }: { match: Match; summary?: GameSummary }) {
  const [mode, setMode] = useState<"teams" | "players">("teams");
  const hasPlayers = Boolean(summary?.players.length);
  const hasTeams = Boolean(summary?.stats.length || match.stats.length);
  const players = hasPlayers && (mode === "players" || !hasTeams);
  return (
    <div className="flex flex-col gap-3">
      {hasPlayers && (
        <ConfigSegmented
          label="Game statistics"
          value={players ? "players" : "teams"}
          options={[
            { value: "teams", label: "Teams", disabled: !hasTeams },
            { value: "players", label: "Players" },
          ]}
          onChange={setMode}
        />
      )}
      {players && summary ? (
        <GamePlayers groups={summary.players} />
      ) : (
        <>
          <div className="text-ink-3 text-micro flex items-center justify-between gap-2">
            <span>{match.away.abbreviation}</span>
            <span>{summary?.context === "season" ? "Season context" : "Game statistics"}</span>
            <span>{match.home.abbreviation}</span>
          </div>
          {summary?.stats.length ? (
            <ul className="flex flex-col gap-3">
              {summary.stats.map((stat) => {
                const total = (stat.awayValue ?? 0) + (stat.homeValue ?? 0);
                return (
                  <li key={stat.key} className="flex flex-col gap-1.5">
                    <div
                      className="
                        text-caption grid grid-cols-[4rem_minmax(0,1fr)_4rem] items-center gap-2
                      "
                    >
                      <span className="text-ink text-left font-medium tabular-nums">
                        {stat.away}
                      </span>
                      <span className="text-ink-3 text-center">{stat.label}</span>
                      <span className="text-ink text-right font-medium tabular-nums">
                        {stat.home}
                      </span>
                    </div>
                    {stat.awayValue != null && stat.homeValue != null && total > 0 && (
                      <div
                        aria-hidden
                        className="bg-foreground/5 flex h-1 gap-0.5 overflow-hidden rounded-full"
                      >
                        <span
                          className="bg-ink-3"
                          style={{ width: `${(stat.awayValue / total) * 100}%` }}
                        />
                        <span className="bg-foreground/20 flex-1" />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <MatchStats stats={match.stats} />
          )}
        </>
      )}
    </div>
  );
}
