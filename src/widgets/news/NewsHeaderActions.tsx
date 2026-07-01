import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import { useNewsResource } from "@/widgets/news/hooks/useNewsResource";
import { NEWS_SYNC_COOLDOWN_MS } from "@/widgets/news/useNewsStore";

export function NewsHeaderActions() {
  const { refresh, isRefreshing, lastSyncedAt } = useNewsResource();

  return (
    <WidgetRefreshButton
      syncing={isRefreshing}
      lastSyncAt={lastSyncedAt}
      cooldownMs={NEWS_SYNC_COOLDOWN_MS}
      onRefresh={refresh}
    />
  );
}
