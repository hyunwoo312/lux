import type { SettingEntry } from "@/settings/searchIndex";
import { ArrowUpRight, Search } from "lucide-react";
import { SETTINGS_TAB_META } from "@/settings/tabsMeta";
import { useRovingFocus } from "@/hooks/useRovingFocus";
import { ROW } from "@/lib/row";
import { cn } from "@/lib/utils";

type Props = {
  compact?: boolean;
  results: SettingEntry[];
  onSelect: (entry: SettingEntry) => void;
};

export function SearchResults({ results, onSelect, compact = false }: Props) {
  const roving = useRovingFocus({ count: results.length, orientation: "vertical" });
  if (results.length === 0) {
    return compact ? (
      <p className="text-ink-4 px-2 py-3 text-caption">No settings match that.</p>
    ) : (
      <div className="text-ink-3 flex flex-col items-center gap-2 py-10 text-center">
        <Search className="text-ink-4 size-5" aria-hidden />
        <p className="text-body font-medium">No settings found</p>
        <p className="text-caption">Try a setting name, section, or feature.</p>
      </div>
    );
  }

  return (
    <div {...roving.containerProps} className="flex flex-col gap-1" aria-label="Matching settings">
      {results.map((entry, index) => (
        <button
          key={entry.settingId}
          {...roving.itemProps(index)}
          data-settings-result
          type="button"
          onClick={() => onSelect(entry)}
          className={cn(
            ROW.nav,
            "group hover:bg-accent/50 items-start",
            compact ? "gap-1 py-1.5" : "gap-3 px-3 py-3",
          )}
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className={cn("text-ink font-medium", compact ? "text-caption" : "text-body")}>
              {entry.label}
            </span>
            {!compact && <span className="text-ink-3 text-caption">{entry.description}</span>}
            <span className="text-ink-4 text-micro">
              {SETTINGS_TAB_META[entry.tab].label} · {entry.section}
            </span>
          </span>
          {!compact && (
            <ArrowUpRight
              className={cn(
                "text-ink-4 mt-0.5 size-4 shrink-0 transition-colors",
                "group-hover:text-primary",
              )}
              aria-hidden
            />
          )}
        </button>
      ))}
    </div>
  );
}
