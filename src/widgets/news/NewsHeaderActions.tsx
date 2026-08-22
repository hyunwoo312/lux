import { LayoutGrid, List } from "lucide-react";
import { ViewToggleButton } from "@/widgets/core/ViewToggleButton";
import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import { hasThumbnails } from "@/widgets/news/lib/news";
import { useNewsResource } from "@/widgets/news/hooks/useNewsResource";
import { useTrendingResource } from "@/widgets/news/hooks/useTrendingResource";
import { NEWS_SYNC_COOLDOWN_MS, useNews, useNewsStore } from "@/widgets/news/useNewsStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function NewsHeaderActions() {
  const view = useNews((d) => d.view);
  const isTrending = view === "trending";
  const news = useNewsResource(!isTrending);
  const trending = useTrendingResource(isTrending);
  const active = isTrending ? trending : news;

  const enabledSources = useNews((d) => d.enabledSources);
  const withThumbnail = isTrending
    ? true
    : news.tab === "all"
      ? enabledSources.some(hasThumbnails)
      : hasThumbnails(news.tab);

  return (
    <div className="flex items-center gap-0.5">
      <WidgetRefreshButton
        label={isTrending ? "Trending" : "News"}
        syncing={active.isRefreshing}
        lastSyncAt={active.lastSyncedAt}
        cooldownMs={NEWS_SYNC_COOLDOWN_MS}
        freshness={active.freshness}
        onRefresh={active.refresh}
      />
      <span className="bg-border/50 mx-0.5 h-4 w-px shrink-0" aria-hidden />
      <NewsLayoutToggle available={withThumbnail} />
    </div>
  );
}

function NewsLayoutToggle({ available }: { available: boolean }) {
  const instanceId = useWidgetInstanceId();
  const layout = useNews((d) => d.layout);
  const loadImages = useNews((d) => d.loadImages);
  const setLayout = useNewsStore((s) => s.setLayout);
  const isList = layout === "list";

  if (!loadImages || !available) return null;

  return (
    <ViewToggleButton
      targetKey={isList ? "tiles" : "list"}
      targetLabel={isList ? "tile view" : "list view"}
      icon={isList ? LayoutGrid : List}
      onToggle={() => setLayout(instanceId, isList ? "tiles" : "list")}
    />
  );
}
