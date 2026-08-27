import { Layers } from "lucide-react";
import { WidgetTabs, type WidgetTab } from "@/widgets/core/WidgetTabs";
import { orderedSources, resolveNewsTab, sourceTab } from "@/widgets/news/lib/news";
import { SOURCE_ICONS } from "@/widgets/news/components/sourceIcons";
import { type NewsTab } from "@/widgets/news/types";
import { useNews, useNewsStore } from "@/widgets/news/useNewsStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function NewsSourceBar() {
  const instanceId = useWidgetInstanceId();
  const activeSource = useNews((d) => d.activeSource);
  const enabledSources = useNews((d) => d.enabledSources);
  const setActiveSource = useNewsStore((s) => s.setActiveSource);

  const sources = orderedSources(enabledSources);
  if (sources.length < 2) return null;
  const value = resolveNewsTab(activeSource, sources);

  const tabs: WidgetTab<NewsTab>[] = [
    { value: "all", label: "All", icon: Layers },
    ...sources.map((source, index) => ({
      value: source,
      label: sourceTab(source),
      icon: SOURCE_ICONS[source],
      separated: index === 0,
    })),
  ];

  return (
    <div className="shrink-0 px-1 pb-1">
      <WidgetTabs tabs={tabs} value={value} onSelect={(tab) => setActiveSource(instanceId, tab)} />
    </div>
  );
}
