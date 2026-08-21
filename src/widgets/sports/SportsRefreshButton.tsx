import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import { useScoreboard } from "@/widgets/sports/hooks/useScoreboard";
import { SPORTS_SYNC_COOLDOWN_MS } from "@/widgets/sports/useSportsStore";

export function SportsRefreshButton() {
  const { refresh, isRefreshing, lastSyncedAt, freshness } = useScoreboard();

  return (
    <WidgetRefreshButton
      label="Sports"
      syncing={isRefreshing}
      lastSyncAt={lastSyncedAt}
      updatedAt={lastSyncedAt}
      freshness={freshness}
      cooldownMs={SPORTS_SYNC_COOLDOWN_MS}
      onRefresh={refresh}
    />
  );
}
