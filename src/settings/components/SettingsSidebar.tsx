import { useEffect, useState } from "react";
import { ChevronLeft, Search, Settings } from "lucide-react";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DIALOG_RAIL, RailItem } from "@/components/DialogChrome";
import { Separator } from "@/components/ui/separator";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useRovingFocus } from "@/hooks/useRovingFocus";
import { SETTINGS_TAB_META } from "@/settings/tabsMeta";
import { SETTINGS_TABS, useSettingsStore } from "@/stores/useSettingsStore";
import { Button } from "@/components/ui/button";
import { LuxMark } from "@/components/LuxMark";
import { SearchField } from "@/components/SearchField";
import { SearchResults } from "@/settings/components/SearchResults";
import { searchSettings } from "@/settings/searchIndex";

export function SettingsSidebar() {
  const tab = useSettingsStore((s) => s.tab);
  const setTab = useSettingsStore((s) => s.setTab);
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar);

  const openSearch = useSettingsStore((s) => s.openSearch);
  const searchOpen = useSettingsStore((s) => s.searchOpen);
  const query = useSettingsStore((s) => s.searchQuery);
  const setQuery = useSettingsStore((s) => s.setSearchQuery);
  const navigate = useSettingsStore((s) => s.navigateToSetting);
  const closeSearch = useSettingsStore((s) => s.closeSearch);
  const clearDestination = useSettingsStore((s) => s.clearDestination);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const update = () => setIsNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const effectiveCollapsed = isNarrow || collapsed;

  const roving = useRovingFocus({
    count: SETTINGS_TABS.length,
    orientation: "vertical",
    activeIndex: SETTINGS_TABS.indexOf(tab),
    onActivate: (index) => {
      const next = SETTINGS_TABS[index];
      if (next) setTab(next);
    },
  });

  return (
    <aside
      className={cn(
        DIALOG_RAIL,
        "overflow-hidden transition-[width] duration-base ease-out",
        effectiveCollapsed ? "w-13" : "w-56",
      )}
    >
      <div className="relative flex h-12 shrink-0 items-center px-4">
        <Settings
          aria-hidden
          className={cn(
            "absolute left-4 size-5 transition-opacity duration-base",
            effectiveCollapsed ? "opacity-100" : "opacity-0",
          )}
        />
        <DialogTitle
          className={cn(
            "text-body font-semibold whitespace-nowrap transition-opacity duration-base",
            effectiveCollapsed ? "opacity-0" : "opacity-100",
          )}
        >
          Settings
        </DialogTitle>
        <DialogDescription className="sr-only">Configure Lux</DialogDescription>
      </div>

      <div className="px-2">
        <Separator />
      </div>

      {effectiveCollapsed ? (
        <div className="px-2 py-2">
          <Button
            id="settings-search-trigger"
            variant="ghost"
            onClick={openSearch}
            aria-label="Search settings"
            title={effectiveCollapsed ? "Search settings" : undefined}
            aria-pressed={searchOpen}
            className={cn(
              "text-ink-3 w-full justify-start gap-4 px-2",
              searchOpen && "text-primary bg-primary/10",
            )}
          >
            <Search className="size-5 shrink-0" aria-hidden />
          </Button>
        </div>
      ) : (
        <div className="px-2 pb-1">
          <SearchField
            value={query}
            onFocus={closeSearch}
            onChange={(value) => {
              clearDestination();
              setQuery(value);
            }}
            label="Search settings"
            size="sm"
            onKeyDown={(event) => {
              const first = searchSettings(query)[0];
              if (event.key === "Enter" && first) {
                event.preventDefault();
                navigate(first);
                setQuery("");
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                document.querySelector<HTMLButtonElement>("[data-settings-result]")?.focus();
              }
            }}
          />
        </div>
      )}
      {!effectiveCollapsed && query.trim() ? (
        <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          <SearchResults
            compact
            results={searchSettings(query)}
            onSelect={(entry) => {
              navigate(entry);
              setQuery("");
            }}
          />
        </div>
      ) : (
        <nav
          role="tablist"
          aria-label="Settings sections"
          {...roving.containerProps}
          className="flex flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto p-2"
        >
          {SETTINGS_TABS.map((id, index) => {
            const { label, icon: Icon } = SETTINGS_TAB_META[id];
            const isActive = id === tab && !searchOpen;
            const button = (
              <RailItem
                {...roving.itemProps(index)}
                role="tab"
                id={`settings-tab-${id}`}
                aria-selected={isActive}
                aria-controls={`settings-panel-${id}`}
                active={isActive}
                layoutId="settings-active-tab"
                onClick={() => setTab(id)}
                className="whitespace-nowrap"
              >
                <Icon className={cn("size-5 shrink-0", isActive && "text-primary")} />
                <span className={cn(isActive && "font-medium")}>{label}</span>
              </RailItem>
            );
            return (
              <div key={id}>
                {effectiveCollapsed ? (
                  <Tooltip content={label} side="right" prose>
                    {button}
                  </Tooltip>
                ) : (
                  button
                )}
              </div>
            );
          })}
        </nav>
      )}

      <div
        className={cn(
          "border-edge-2 flex h-12 shrink-0 items-center border-t px-2",
          effectiveCollapsed ? "justify-center" : "justify-between",
        )}
      >
        {!effectiveCollapsed && (
          <div className="flex items-center gap-4 pl-2">
            <LuxMark className="size-5" />
            <span className="text-body font-medium">Lux</span>
          </div>
        )}
        {isNarrow ? (
          <LuxMark className="size-4" />
        ) : (
          <Tooltip content={collapsed ? "Expand" : "Collapse"} side="right" prose>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="text-ink-3 hover:text-ink"
            >
              <ChevronLeft
                className={cn("transition-transform duration-base", collapsed && "rotate-180")}
              />
            </Button>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}
