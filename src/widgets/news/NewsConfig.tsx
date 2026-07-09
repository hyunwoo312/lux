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
import type { OpenBehavior } from "@/lib/open-url";
import { sourceTab } from "@/widgets/news/lib/news";
import { SOURCE_ICONS } from "@/widgets/news/components/sourceIcons";
import { NEWS_REGIONS, NEWS_SOURCES, type NewsRegion } from "@/widgets/news/types";
import { MAX_ENABLED_SOURCES, useNews, useNewsStore } from "@/widgets/news/useNewsStore";
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

const SOURCE_OPTIONS = NEWS_SOURCES.map((source) => ({
  value: source,
  label: sourceTab(source),
  icon: SOURCE_ICONS[source],
}));

const OPEN_OPTIONS: { value: OpenBehavior; label: string }[] = [
  { value: "currentTab", label: "This tab" },
  { value: "newTab", label: "New tab" },
];

export function NewsConfig() {
  const instanceId = useWidgetInstanceId();
  const region = useNews((d) => d.region);
  const openBehavior = useNews((d) => d.openBehavior);
  const enabledSources = useNews((d) => d.enabledSources);
  const sortByLatest = useNews((d) => d.sortByLatest);
  const setRegion = useNewsStore((s) => s.setRegion);
  const setOpenBehavior = useNewsStore((s) => s.setOpenBehavior);
  const setEnabledSources = useNewsStore((s) => s.setEnabledSources);
  const setSortByLatest = useNewsStore((s) => s.setSortByLatest);

  const orderedEnabled = NEWS_SOURCES.filter((source) => enabledSources.includes(source));

  return (
    <>
      <WidgetConfigGroup label="News">
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

      <WidgetConfigGroup label="Sources">
        <WidgetConfigItem
          title="Show"
          description={`Which sources appear as tabs (up to ${MAX_ENABLED_SOURCES})`}
        >
          <ConfigMultiToggle
            label="Sources"
            values={orderedEnabled}
            options={SOURCE_OPTIONS}
            maxSelected={MAX_ENABLED_SOURCES}
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
  onAdd: (term: string) => void;
  onRemove: (term: string) => void;
}) {
  const [value, setValue] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onAdd(value);
    setValue("");
  };

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={submit}>
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Add a keyword and press Enter"
          aria-label={inputLabel}
          maxLength={40}
        />
      </form>
      {terms.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {terms.map((term) => (
            <li
              key={term}
              className="
                border-border text-muted-foreground flex items-center gap-1 rounded-full border
                px-2.5 py-1 text-xs font-medium
              "
            >
              {term}
              <button
                type="button"
                onClick={() => onRemove(term)}
                aria-label={removeLabel(term)}
                className="
                  hover:text-foreground
                  focus-visible:ring-ring/40
                  rounded-full outline-none
                  focus-visible:ring-2
                "
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
