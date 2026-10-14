import { useEffect, useRef } from "react";
import { SearchField } from "@/components/SearchField";
import { SearchResults } from "@/settings/components/SearchResults";
import { searchSettings } from "@/settings/searchIndex";
import { SETTINGS_TABS, useSettingsStore } from "@/stores/useSettingsStore";
import { SETTINGS_TAB_META } from "@/settings/tabsMeta";

export function SettingsSearch() {
  const query = useSettingsStore((s) => s.searchQuery);
  const setQuery = useSettingsStore((s) => s.setSearchQuery);
  const navigate = useSettingsStore((s) => s.navigateToSetting);
  const setTab = useSettingsStore((s) => s.setTab);
  const input = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const results = searchSettings(query);
  const searching = query.trim().length > 0;

  useEffect(() => {
    input.current?.focus();
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-5 sm:px-6">
      <SearchField
        ref={input}
        value={query}
        onChange={setQuery}
        label="Find a setting"
        placeholder="Search settings and features…"
        onKeyDown={(event) => {
          if (event.key === "Enter" && searching && results[0]) {
            event.preventDefault();
            navigate(results[0]);
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            resultsRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
          }
        }}
      />
      <p role="status" className="text-ink-4 text-caption">
        {searching
          ? `${results.length} matching settings${results.length === 8 ? " · Refine your search for more" : ""}`
          : "Find a setting or browse a section"}
      </p>
      <div ref={resultsRef} className="min-h-0 overflow-y-auto scroll-fade scrollbar-inset-b pb-3">
        {searching ? (
          <SearchResults key={query} results={results} onSelect={navigate} />
        ) : (
          <div className="flex flex-col gap-1">
            {SETTINGS_TABS.map((tab) => {
              const { icon: Icon, label } = SETTINGS_TAB_META[tab];
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTab(tab)}
                  className="
                    text-ink-2 focus-ring
                    hover:bg-accent/50
                    flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-left text-body
                    transition-colors
                  "
                >
                  <Icon className="text-ink-3 size-4 shrink-0" aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
