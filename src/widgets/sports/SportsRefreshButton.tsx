import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import { useScoreboard } from "@/widgets/sports/hooks/useScoreboard";
import { SPORTS_SYNC_COOLDOWN_MS } from "@/widgets/sports/useSportsStore";

export function SportsRefreshButton() {
  const { refresh, isRefreshing, lastSyncedAt } = useScoreboard();

  return (
    <WidgetRefreshButton
      syncing={isRefreshing}
      lastSyncAt={lastSyncedAt}
      updatedAt={lastSyncedAt}
      cooldownMs={SPORTS_SYNC_COOLDOWN_MS}
      onRefresh={refresh}
    />
  );
}
