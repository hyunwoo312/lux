import type { FormEvent } from "react";
import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  ConfigMultiToggle,
  ConfigSegmented,
  ConfigSelect,
  WidgetConfigGroup,
  WidgetConfigItem,
} from "@/components/config/WidgetConfig";
import { OPEN_BEHAVIOR_OPTIONS } from "@/lib/open-url";
import { orderedSources, sourceTab } from "@/widgets/news/lib/news";
import { TREND_REGIONS, type TrendRegion } from "@/widgets/news/lib/trend-regions";
import { SOURCE_ICONS } from "@/widgets/news/components/sourceIcons";
import {
  NEWS_REGIONS,
  NEWS_SOURCES,
  NEWS_TOPICS,
  type NewsRegion,
  type NewsTopic,
} from "@/widgets/news/types";
import {
  MAX_ENABLED_SOURCES,
  MAX_TERMS,
  useNews,
  useNewsStore,
  type AddTermResult,
} from "@/widgets/news/useNewsStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const REGION_LABELS: Record<NewsRegion, string> = {
  us: "United States",
  uk: "United Kingdom",
  au: "Australia",
  international: "International",
};

const REGION_OPTIONS = NEWS_REGIONS.map((region) => ({
  value: region,
  label: REGION_LABELS[region],
}));

const TOPIC_LABELS: Record<NewsTopic, string> = {
  top: "Top stories",
  world: "World",
  business: "Business",
  technology: "Technology",
  science: "Science",
  sports: "Sports",
};

const TOPIC_OPTIONS = NEWS_TOPICS.map((topic) => ({
  value: topic,
  label: TOPIC_LABELS[topic],
}));

const SOURCE_OPTIONS = NEWS_SOURCES.map((source) => ({
  value: source,
  label: sourceTab(source),
  icon: SOURCE_ICONS[source],
}));

const TREND_REGION_OPTIONS: { value: TrendRegion; label: string }[] = TREND_REGIONS.map(
  (entry) => ({ value: entry.code as TrendRegion, label: entry.label }),
);

export function NewsConfig() {
  const instanceId = useWidgetInstanceId();
  const region = useNews((d) => d.region);
  const topic = useNews((d) => d.topic);
  const openBehavior = useNews((d) => d.openBehavior);
  const enabledSources = useNews((d) => d.enabledSources);
  const sortByLatest = useNews((d) => d.sortByLatest);
  const loadImages = useNews((d) => d.loadImages);
  const trendRegion = useNews((d) => d.trendRegion);
  const setTrendRegion = useNewsStore((s) => s.setTrendRegion);
  const setRegion = useNewsStore((s) => s.setRegion);
  const setTopic = useNewsStore((s) => s.setTopic);
  const setOpenBehavior = useNewsStore((s) => s.setOpenBehavior);
  const setEnabledSources = useNewsStore((s) => s.setEnabledSources);
  const setSortByLatest = useNewsStore((s) => s.setSortByLatest);
  const setLoadImages = useNewsStore((s) => s.setLoadImages);

  const orderedEnabled = orderedSources(enabledSources);

  return (
    <>
      <WidgetConfigGroup label="News">
        <WidgetConfigItem
          title="Topic"
          description="Section shown where a source offers one"
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
          title="Region"
          description="Edition used where a source offers one"
          control={
            <ConfigSelect
              label="Region"
              value={region}
              options={REGION_OPTIONS}
              onChange={(value) => setRegion(instanceId, value)}
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
              options={OPEN_BEHAVIOR_OPTIONS}
              onChange={(value) => setOpenBehavior(instanceId, value)}
            />
          }
        />
        <WidgetConfigItem
          title="Load images"
          description="Fetch thumbnails from each publisher. Off shows headlines as a plain list."
          control={
            <Switch
              checked={loadImages}
              onCheckedChange={(checked) => setLoadImages(instanceId, checked === true)}
              aria-label="Load images"
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

      <WidgetConfigGroup label="Filters">
        <WidgetConfigItem
          title="Muted keywords"
          description="Hide headlines containing these words"
        >
          <MutedTermsEditor />
        </WidgetConfigItem>
        <WidgetConfigItem
          title="Highlighted keywords"
          description="Call out headlines containing these words"
        >
          <HighlightTermsEditor />
        </WidgetConfigItem>
      </WidgetConfigGroup>

      <WidgetConfigGroup label="Trending">
        <WidgetConfigItem
          title="Region"
          description="Which country's trending searches the Trending tab shows"
          control={
            <ConfigSelect
              label="Trending region"
              value={trendRegion}
              options={TREND_REGION_OPTIONS}
              onChange={(value) => setTrendRegion(instanceId, value)}
            />
          }
        />
      </WidgetConfigGroup>

      <WidgetConfigGroup label="Sources">
        <WidgetConfigItem
          title="Show"
          description={`Which sources appear as tabs (one to ${MAX_ENABLED_SOURCES})`}
        >
          <ConfigMultiToggle
            label="Sources"
            values={orderedEnabled}
            options={SOURCE_OPTIONS}
            maxSelected={MAX_ENABLED_SOURCES}
            minSelected={1}
            onChange={(values) => setEnabledSources(instanceId, values)}
          />
        </WidgetConfigItem>
      </WidgetConfigGroup>
    </>
  );
}

function MutedTermsEditor() {
  const instanceId = useWidgetInstanceId();
  const mutedTerms = useNews((d) => d.mutedTerms);
  const addMutedTerm = useNewsStore((s) => s.addMutedTerm);
  const removeMutedTerm = useNewsStore((s) => s.removeMutedTerm);

  return (
    <TermsEditor
      terms={mutedTerms}
      inputLabel="Add a muted keyword"
      removeLabel={(term) => `Unmute ${term}`}
      onAdd={(term) => addMutedTerm(instanceId, term)}
      onRemove={(term) => removeMutedTerm(instanceId, term)}
    />
  );
}

function HighlightTermsEditor() {
  const instanceId = useWidgetInstanceId();
  const highlightTerms = useNews((d) => d.highlightTerms);
  const addHighlightTerm = useNewsStore((s) => s.addHighlightTerm);
  const removeHighlightTerm = useNewsStore((s) => s.removeHighlightTerm);

  return (
    <TermsEditor
      terms={highlightTerms}
      inputLabel="Add a highlighted keyword"
      removeLabel={(term) => `Stop highlighting ${term}`}
      onAdd={(term) => addHighlightTerm(instanceId, term)}
      onRemove={(term) => removeHighlightTerm(instanceId, term)}
    />
  );
}

const REJECTED_TERM_MESSAGE: Record<Exclude<AddTermResult, "added" | "empty">, string> = {
  duplicate: "Already in the list.",
  full: `Up to ${MAX_TERMS} keywords.`,
};

function TermsEditor({
  terms,
  inputLabel,
  removeLabel,
  onAdd,
  onRemove,
}: {
  terms: string[];
  inputLabel: string;
  removeLabel: (term: string) => string;
  onAdd: (term: string) => AddTermResult;
  onRemove: (term: string) => void;
}) {
  const [value, setValue] = useState("");
  const [rejected, setRejected] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = onAdd(value);
    if (result === "empty") return;
    if (result === "added") {
      setValue("");
      setRejected(null);
      return;
    }
    setRejected(REJECTED_TERM_MESSAGE[result]);
  };

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={submit}>
        <Input
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setRejected(null);
          }}
          placeholder="Add a keyword and press Enter"
          aria-label={inputLabel}
          maxLength={40}
        />
      </form>
      {rejected && (
        <p role="status" className="text-ink-3 text-caption">
          {rejected}
        </p>
      )}
      {terms.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {terms.map((term) => (
            <li
              key={term}
              className="
                border-border text-ink-3 flex items-center gap-1 rounded-full border px-2.5 py-1
                text-caption font-medium
              "
            >
              {term}
              <button
                type="button"
                onClick={() => onRemove(term)}
                aria-label={removeLabel(term)}
                className="press cursor-pointer focus-ring hover:text-ink rounded-full"
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
