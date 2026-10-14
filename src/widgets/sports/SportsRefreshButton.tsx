import {
  refreshPolledResource,
  staleSinceOf,
  useFreshness,
  useResourceGroup,
  type PolledResource,
} from "@/widgets/core/usePolledResource";
import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import { useCurrentLeague } from "@/widgets/sports/hooks/useCurrentLeague";
import { useLeaderboard } from "@/widgets/sports/hooks/useLeaderboard";
import { useTennis } from "@/widgets/sports/hooks/useTennis";
import { useLeagueScoreboard } from "@/widgets/sports/hooks/useScoreboard";
import { scoreboardKey } from "@/widgets/sports/lib/cacheKeys";
import { type League } from "@/widgets/sports/lib/leagues";
import { followedLeagues } from "@/widgets/sports/lib/roster";
import { SPORTS_SYNC_COOLDOWN_MS, useSports } from "@/widgets/sports/useSportsStore";
import { useSportsDate } from "@/widgets/sports/hooks/useSportsDate";
import { datesParam } from "@/widgets/sports/lib/window";
import { useSportsView } from "@/widgets/sports/useSportsViewStore";
import { leagueById } from "@/widgets/sports/lib/leagues";
import { useGameSummary } from "@/widgets/sports/hooks/useGameSummary";
import type { Match } from "@/widgets/sports/types";
import { refreshScoreboardDays } from "@/widgets/sports/lib/scoreboardDays";

type Resource = Omit<PolledResource<unknown>, "state">;

function RefreshFor({ resource }: { resource: Resource }) {
  return (
    <WidgetRefreshButton
      label="Sports"
      syncing={resource.isRefreshing}
      lastSyncAt={resource.lastSyncedAt}
      updatedAt={resource.lastSyncedAt}
      staleSince={staleSinceOf(resource.freshness)}
      cooldownMs={SPORTS_SYNC_COOLDOWN_MS}
      onRefresh={resource.refresh}
    />
  );
}

function ScoreboardRefresh({ league }: { league: League }) {
  const dayWindow = useSports((d) => d.window);
  return <RefreshFor resource={useLeagueScoreboard(league, dayWindow)} />;
}

function LeaderboardRefresh({ league }: { league: League }) {
  return <RefreshFor resource={useLeaderboard(league)} />;
}

function DrawRefresh({ league }: { league: League }) {
  return <RefreshFor resource={useTennis(league)} />;
}

function FavoritesRefresh() {
  const date = useSportsDate();
  const following = useSports((d) => d.following);
  const dayWindow = useSports((d) => d.window);
  const staleSince = staleSinceOf(useFreshness("sports:"));
  const keys = followedLeagues(following).map(({ league }) =>
    scoreboardKey(league, dayWindow, datesParam(dayWindow, date)),
  );
  const { isRefreshing, lastSyncedAt } = useResourceGroup(keys);

  return (
    <WidgetRefreshButton
      label="Sports"
      syncing={isRefreshing}
      lastSyncAt={lastSyncedAt}
      updatedAt={lastSyncedAt}
      staleSince={staleSince}
      cooldownMs={SPORTS_SYNC_COOLDOWN_MS}
      onRefresh={() => {
        followedLeagues(following).forEach(({ league }) => {
          if (league.kind === "match")
            refreshScoreboardDays(league.path, datesParam(dayWindow, date));
        });
        keys.forEach(refreshPolledResource);
      }}
    />
  );
}

export function SportsRefreshButton() {
  const tab = useSports((d) => d.tab);
  const league = useCurrentLeague();
  const selected = useSportsView((view) => view.selected);
  const selectedLeague = selected ? leagueById(selected.leagueId) : null;
  if (selected && selectedLeague)
    return <GameRefresh league={selectedLeague} initial={selected.match} />;

  if (tab === "favorites") return <FavoritesRefresh />;

  if (league.kind === "leaderboard") return <LeaderboardRefresh league={league} />;
  if (league.kind === "draw") return <DrawRefresh league={league} />;
  return <ScoreboardRefresh league={league} />;
}

function GameRefresh({ league, initial }: { league: League; initial: Match }) {
  const window = useSports((data) => data.window);
  const scores = useLeagueScoreboard(league, window);
  const match =
    scores.state.status === "success"
      ? (scores.state.data.find((match) => match.id === initial.id) ?? initial)
      : initial;
  const detail = useGameSummary(league, match);
  const supported = league.id === "nba" || league.id === "nfl";
  const at =
    supported && detail.lastSyncedAt
      ? Math.min(scores.lastSyncedAt || detail.lastSyncedAt, detail.lastSyncedAt)
      : scores.lastSyncedAt;
  return (
    <WidgetRefreshButton
      label="Sports"
      syncing={scores.isRefreshing || detail.isRefreshing}
      lastSyncAt={at}
      updatedAt={at}
      staleSince={staleSinceOf(detail.freshness) ?? staleSinceOf(scores.freshness)}
      cooldownMs={SPORTS_SYNC_COOLDOWN_MS}
      onRefresh={() => {
        scores.refresh();
        if (supported) detail.refresh();
      }}
    />
  );
}
