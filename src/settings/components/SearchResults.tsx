import type { SettingEntry } from "@/settings/searchIndex";
import { SETTINGS_TAB_META } from "@/settings/tabsMeta";
import type { SettingsTab } from "@/settings/useSettingsStore";

type Props = {
  results: SettingEntry[];
  onSelect: (tab: SettingsTab) => void;
};

export function SearchResults({ results, onSelect }: Props) {
  if (results.length === 0) {
    return <p className="text-ink-4 px-2 py-3 text-caption">No settings match that.</p>;
  }

  return (
    <>
      {results.map((entry) => (
        <button
          key={`${entry.tab}-${entry.label}`}
          type="button"
          onClick={() => onSelect(entry.tab)}
          className="
            press-row focus-ring
            hover:bg-accent/50
            flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-lg px-2 py-1.5 text-left
            transition-colors
          "
        >
          <span className="text-ink text-caption font-medium">{entry.label}</span>
          <span className="text-ink-4 text-micro">
            {SETTINGS_TAB_META[entry.tab].label} · {entry.section}
          </span>
        </button>
      ))}
    </>
  );
}
