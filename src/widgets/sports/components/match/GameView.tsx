import { useLayoutEffect, useRef, useState } from "react";
import { BarChart3, ClipboardList, ListOrdered } from "lucide-react";
import { ErrorState } from "@/components/StateMessage";
import { WidgetTabs, type WidgetTab } from "@/widgets/core/WidgetTabs";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { useNow } from "@/hooks/useNow";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import {
  useFollowing,
  useSports,
  useSportsStore,
  MAX_TEAMS,
} from "@/widgets/sports/useSportsStore";
import { useSportsViewStore } from "@/widgets/sports/useSportsViewStore";
import { useLeagueScoreboard } from "@/widgets/sports/hooks/useScoreboard";
import { useGameSummary } from "@/widgets/sports/hooks/useGameSummary";
import { MatchTeams } from "@/widgets/sports/components/match/MatchTeams";
import { MatchDetail } from "@/widgets/sports/components/match/MatchDetail";
import { GameStats } from "@/widgets/sports/components/match/GameStats";
import { GamePlays } from "@/widgets/sports/components/match/GamePlays";
import { MatchTimeline } from "@/widgets/sports/components/match/MatchTimeline";
import { matchStatus } from "@/widgets/sports/lib/status";
import type { League } from "@/widgets/sports/lib/leagues";
import type { Match } from "@/widgets/sports/types";

type Section = "overview" | "stats" | "plays";

export function GameView({ league, initial }: { league: League; initial: Match }) {
  const id = useWidgetInstanceId();
  const window = useSports((data) => data.window);
  const scores = useLeagueScoreboard(league, window);
  const match =
    scores.state.status === "success"
      ? (scores.state.data.find((match) => match.id === initial.id) ?? initial)
      : initial;
  const resource = useGameSummary(league, match);
  const summary = resource.state.status === "success" ? resource.state.data : undefined;
  const following = useFollowing(league.id);
  const now = useNow(30_000).getTime();
  const hour12 = !useAppSettingsStore((state) => state.clock24h);
  const [section, setSection] = useState<Section>("overview");
  const scroll = useRef<HTMLDivElement>(null);
  const positions = useRef<Partial<Record<Section, number>>>({});
  const hasStats = Boolean(match.stats.length || summary?.stats.length || summary?.players.length);
  const hasPlays = Boolean(summary?.plays.length || match.events.length);
  const active =
    (section === "stats" && !hasStats) || (section === "plays" && !hasPlays) ? "overview" : section;
  useLayoutEffect(() => {
    if (scroll.current) scroll.current.scrollTop = positions.current[active] ?? 0;
  }, [active]);
  const tabs: WidgetTab<Section>[] = [
    { value: "overview", label: "Overview", icon: ClipboardList },
    ...(hasStats ? [{ value: "stats" as const, label: "Stats", icon: BarChart3 }] : []),
    ...(hasPlays ? [{ value: "plays" as const, label: "Plays", icon: ListOrdered }] : []),
  ];
  const supported = league.id === "nba" || league.id === "nfl";
  return (
    <div
      role="region"
      aria-label={`${league.label} game details`}
      className="flex h-full min-h-0 flex-col gap-2 p-1"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented)
          useSportsViewStore.getState().setView(id, { selected: null });
      }}
    >
      <div className="shrink-0 px-2 pt-1">
        <MatchTeams
          match={match}
          followed={following.teams}
          followAction={{
            toggle: (team) => useSportsStore.getState().toggleTeam(id, league.id, team),
            canAdd: following.teams.length < MAX_TEAMS,
          }}
        />
        <div className="text-ink-3 text-micro mt-2 text-center tabular-nums">
          {[match.phase, matchStatus(match, now, hour12)].filter(Boolean).join(" · ")}
        </div>
      </div>
      <div className="shrink-0">
        <WidgetTabs
          tabs={tabs}
          value={active}
          onSelect={(next) => {
            positions.current[active] = scroll.current?.scrollTop ?? 0;
            setSection(next);
          }}
        />
      </div>
      <div
        ref={scroll}
        data-game-scroll
        className="scroll-fade min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-1"
      >
        {supported && resource.state.status === "loading" && (
          <p className="text-ink-3 text-caption mb-3">Loading extra details…</p>
        )}
        {supported && resource.state.status === "error" && (
          <ErrorState
            error={resource.state.error}
            service="ESPN"
            subject="game details"
            onRetry={resource.refresh}
            retrying={resource.isRefreshing}
          />
        )}
        <div role="tabpanel" aria-label="Overview" hidden={active !== "overview"}>
          <MatchDetail match={{ ...match, stats: [], events: [] }} sport={league.sport} />
        </div>
        {hasStats && (
          <div role="tabpanel" aria-label="Stats" hidden={active !== "stats"}>
            <GameStats match={match} summary={summary} />
          </div>
        )}
        {hasPlays && (
          <div role="tabpanel" aria-label="Plays" hidden={active !== "plays"}>
            {summary?.plays.length ? (
              <GamePlays summary={summary} football={league.sport === "football"} />
            ) : (
              <MatchTimeline events={match.events} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
