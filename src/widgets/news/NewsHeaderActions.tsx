import { LayoutGrid, List } from "lucide-react";
import { ViewToggleButton } from "@/widgets/core/ViewToggleButton";
import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import { useNewsResource } from "@/widgets/news/hooks/useNewsResource";
import { NEWS_SYNC_COOLDOWN_MS, useNews, useNewsStore } from "@/widgets/news/useNewsStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function NewsHeaderActions() {
  const { refresh, isRefreshing, lastSyncedAt } = useNewsResource();

  return (
    <div className="flex items-center gap-0.5">
      <WidgetRefreshButton
        syncing={isRefreshing}
        lastSyncAt={lastSyncedAt}
        cooldownMs={NEWS_SYNC_COOLDOWN_MS}
        onRefresh={refresh}
      />
      <span className="bg-border/50 mx-0.5 h-4 w-px shrink-0" aria-hidden />
      <NewsLayoutToggle />
    </div>
  );
}

function NewsLayoutToggle() {
  const instanceId = useWidgetInstanceId();
  const layout = useNews((d) => d.layout);
  const setLayout = useNewsStore((s) => s.setLayout);
  const isList = layout === "list";

  return (
    <ViewToggleButton
      targetKey={isList ? "tiles" : "list"}
      targetLabel={isList ? "tile view" : "list view"}
      icon={isList ? LayoutGrid : List}
      onToggle={() => setLayout(instanceId, isList ? "tiles" : "list")}
    />
  );
}
