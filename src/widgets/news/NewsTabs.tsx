import { WidgetTabs } from "@/widgets/core/WidgetTabs";
import { sourceTab } from "@/widgets/news/lib/news";
import {
  BbcIcon,
  GoogleNewsIcon,
  NytIcon,
  YahooNewsIcon,
} from "@/widgets/news/components/SourceIcon";
import { NEWS_SOURCES, type NewsSource } from "@/widgets/news/types";
import type { WidgetIcon } from "@/widgets/core/types";
import { useNews, useNewsStore } from "@/widgets/news/useNewsStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const SOURCE_ICONS: Record<NewsSource, WidgetIcon> = {
  google: GoogleNewsIcon,
  nyt: NytIcon,
  bbc: BbcIcon,
  yahoo: YahooNewsIcon,
};

export function NewsTabs() {
  const instanceId = useWidgetInstanceId();
  const activeSource = useNews((d) => d.activeSource);
  const enabledSources = useNews((d) => d.enabledSources);
  const setActiveSource = useNewsStore((s) => s.setActiveSource);

  const sources = NEWS_SOURCES.filter((source) => enabledSources.includes(source));
  const value = sources.includes(activeSource) ? activeSource : sources[0];
  if (!value) return null;

  return (
    <WidgetTabs
      tabs={sources.map((source) => ({
        value: source,
        label: sourceTab(source),
        icon: SOURCE_ICONS[source],
      }))}
      value={value}
      onSelect={(source) => setActiveSource(instanceId, source)}
    />
  );
}
