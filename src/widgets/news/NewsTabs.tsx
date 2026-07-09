import { Layers } from "lucide-react";
import { WidgetTabs, type WidgetTab } from "@/widgets/core/WidgetTabs";
import { resolveNewsTab, sourceTab } from "@/widgets/news/lib/news";
import { SOURCE_ICONS } from "@/widgets/news/components/sourceIcons";
import { NEWS_SOURCES, type NewsTab } from "@/widgets/news/types";
import { useNews, useNewsStore } from "@/widgets/news/useNewsStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function NewsTabs() {
  const instanceId = useWidgetInstanceId();
  const activeSource = useNews((d) => d.activeSource);
  const enabledSources = useNews((d) => d.enabledSources);
  const setActiveSource = useNewsStore((s) => s.setActiveSource);

  const sources = NEWS_SOURCES.filter((source) => enabledSources.includes(source));
  const value = resolveNewsTab(activeSource, sources);

  const tabs: WidgetTab<NewsTab>[] = sources.map((source) => ({
    value: source,
    label: sourceTab(source),
    icon: SOURCE_ICONS[source],
  }));
  if (sources.length > 1) tabs.unshift({ value: "all", label: "All", icon: Layers });

  return (
    <WidgetTabs tabs={tabs} value={value} onSelect={(tab) => setActiveSource(instanceId, tab)} />
  );
}
