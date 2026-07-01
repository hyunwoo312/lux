import { Switch } from "@/components/ui/switch";
import {
  ConfigMultiToggle,
  ConfigSegmented,
  ConfigSelect,
  WidgetConfigGroup,
  WidgetConfigItem,
} from "@/components/config/WidgetConfig";
import type { OpenBehavior } from "@/lib/open-url";
import { sourceTab } from "@/widgets/news/lib/news";
import { NEWS_SOURCES, NEWS_TOPICS, type NewsTopic } from "@/widgets/news/types";
import { useNews, useNewsStore } from "@/widgets/news/useNewsStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const TOPIC_LABELS: Record<NewsTopic, string> = {
  top: "Top stories",
  world: "World",
  business: "Business",
  technology: "Technology",
  science: "Science",
  health: "Health",
  sports: "Sports",
  entertainment: "Entertainment",
};

const TOPIC_OPTIONS = NEWS_TOPICS.map((topic) => ({ value: topic, label: TOPIC_LABELS[topic] }));

const SOURCE_OPTIONS = NEWS_SOURCES.map((source) => ({
  value: source,
  label: sourceTab(source),
}));

const OPEN_OPTIONS: { value: OpenBehavior; label: string }[] = [
  { value: "currentTab", label: "This tab" },
  { value: "newTab", label: "New tab" },
];

export function NewsConfig() {
  const instanceId = useWidgetInstanceId();
  const topic = useNews((d) => d.topic);
  const openBehavior = useNews((d) => d.openBehavior);
  const enabledSources = useNews((d) => d.enabledSources);
  const sortByLatest = useNews((d) => d.sortByLatest);
  const setTopic = useNewsStore((s) => s.setTopic);
  const setOpenBehavior = useNewsStore((s) => s.setOpenBehavior);
  const setEnabledSources = useNewsStore((s) => s.setEnabledSources);
  const setSortByLatest = useNewsStore((s) => s.setSortByLatest);

  const orderedEnabled = NEWS_SOURCES.filter((source) => enabledSources.includes(source));

  return (
    <>
      <WidgetConfigGroup label="News">
        <WidgetConfigItem
          title="Topic"
          description="Section to show, where the source supports it"
          control={
            <ConfigSelect
              label="Topic"
              value={topic}
              options={TOPIC_OPTIONS}
              onChange={(value) => setTopic(instanceId, value)}
            />
          }
        />
        <WidgetConfigItem
          title="Open in"
          description="Where headlines open"
          control={
            <ConfigSegmented
              label="Open headlines in"
              value={openBehavior}
              options={OPEN_OPTIONS}
              onChange={(value) => setOpenBehavior(instanceId, value)}
            />
          }
        />
        <WidgetConfigItem
          title="Newest first"
          description="Sort headlines by most recent instead of the source's order"
          control={
            <Switch
              checked={sortByLatest}
              onCheckedChange={(checked) => setSortByLatest(instanceId, checked === true)}
              aria-label="Sort by newest first"
            />
          }
        />
      </WidgetConfigGroup>

      <WidgetConfigGroup label="Sources">
        <WidgetConfigItem title="Show" description="Which sources appear as tabs">
          <ConfigMultiToggle
            label="Sources"
            values={orderedEnabled}
            options={SOURCE_OPTIONS}
            onChange={(values) => setEnabledSources(instanceId, values)}
          />
        </WidgetConfigItem>
      </WidgetConfigGroup>
    </>
  );
}
