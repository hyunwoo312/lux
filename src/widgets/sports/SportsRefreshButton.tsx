import {
  refreshPolledResource,
  useFreshness,
  useResourceGroup,
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

type Resource = {
  refresh: () => void;
  isRefreshing: boolean;
  lastSyncedAt: number;
  freshness: Parameters<typeof WidgetRefreshButton>[0]["freshness"];
};

function Button({ resource }: { resource: Resource }) {
  return (
    <WidgetRefreshButton
      label="Sports"
      syncing={resource.isRefreshing}
      lastSyncAt={resource.lastSyncedAt}
      updatedAt={resource.lastSyncedAt}
      freshness={resource.freshness}
      cooldownMs={SPORTS_SYNC_COOLDOWN_MS}
      onRefresh={resource.refresh}
    />
  );
}

function ScoreboardRefresh({ league }: { league: League }) {
  const dayWindow = useSports((d) => d.window);
  return <Button resource={useLeagueScoreboard(league, dayWindow)} />;
}

function LeaderboardRefresh({ league }: { league: League }) {
  return <Button resource={useLeaderboard(league)} />;
}

function DrawRefresh({ league }: { league: League }) {
  return <Button resource={useTennis(league)} />;
}

function FavoritesRefresh() {
  const following = useSports((d) => d.following);
  const dayWindow = useSports((d) => d.window);
  const freshness = useFreshness("sports:");
  const keys = followedLeagues(following).map(({ league }) => scoreboardKey(league, dayWindow));
  const { isRefreshing, lastSyncedAt } = useResourceGroup(keys);

  return (
    <WidgetRefreshButton
      label="Sports"
      syncing={isRefreshing}
      lastSyncAt={lastSyncedAt}
      updatedAt={lastSyncedAt}
      freshness={freshness}
      cooldownMs={SPORTS_SYNC_COOLDOWN_MS}
      onRefresh={() => keys.forEach(refreshPolledResource)}
    />
  );
}

export function SportsRefreshButton() {
  const tab = useSports((d) => d.tab);
  const league = useCurrentLeague();

  if (tab === "favorites") return <FavoritesRefresh />;

  if (league.kind === "leaderboard") return <LeaderboardRefresh league={league} />;
  if (league.kind === "draw") return <DrawRefresh league={league} />;
  return <ScoreboardRefresh league={league} />;
}
