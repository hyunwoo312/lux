import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChevronLeft, Settings } from "lucide-react";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DIALOG_RAIL } from "@/components/DialogChrome";
import { SearchField } from "@/components/SearchField";
import { SearchResults } from "@/settings/components/SearchResults";
import { Separator } from "@/components/ui/separator";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { springCrisp } from "@/lib/motion";
import { useRovingFocus } from "@/hooks/useRovingFocus";
import { searchSettings } from "@/settings/searchIndex";
import { SETTINGS_TAB_META } from "@/settings/tabsMeta";
import { SETTINGS_TABS, useSettingsStore } from "@/settings/useSettingsStore";

export function SettingsSidebar({ open }: { open: boolean }) {
  const tab = useSettingsStore((s) => s.tab);
  const setTab = useSettingsStore((s) => s.setTab);
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar);
  const reduced = useReducedMotion();

  const [query, setQuery] = useState("");
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const update = () => setIsNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const results = searchSettings(query);
  const searching = query.trim().length > 0;
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
        "overflow-hidden transition-[width] duration-200 ease-out",
        effectiveCollapsed ? "w-13" : "w-56",
      )}
    >
      <div className="relative flex h-12 shrink-0 items-center px-4">
        <Settings
          aria-hidden
          className={cn(
            "absolute left-4 size-5 transition-opacity duration-200",
            effectiveCollapsed ? "opacity-100" : "opacity-0",
          )}
        />
        <DialogTitle
          className={cn(
            "text-body font-semibold whitespace-nowrap transition-opacity duration-200",
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

      {!effectiveCollapsed && (
        <div className="px-2 pb-1">
          <SearchField value={query} onChange={setQuery} label="Search settings" size="sm" />
        </div>
      )}

      {searching ? (
        <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          <SearchResults
            results={results}
            onSelect={(next) => {
              setTab(next);
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
            const isActive = id === tab;
            const button = (
              <button
                {...roving.itemProps(index)}
                type="button"
                role="tab"
                id={`settings-tab-${id}`}
                aria-selected={isActive}
                aria-controls="settings-panel"
                onClick={() => setTab(id)}
                className={cn(
                  "press-row focus-ring transition-colors cursor-pointer",
                  `
                    relative flex w-full items-center rounded-lg px-2 py-2 text-body
                    whitespace-nowrap
                  `,
                  isActive ? "text-ink" : "text-ink-3 hover:bg-accent/50",
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="settings-active-tab"
                    className="bg-primary/12 ring-primary/25 absolute inset-0 rounded-lg ring-1"
                    transition={springCrisp(reduced)}
                  />
                )}
                <span className="relative z-10 flex items-center gap-4">
                  <Icon className={cn("size-5 shrink-0", isActive && "text-primary")} />
                  <span className={cn(isActive && "font-medium")}>{label}</span>
                </span>
              </button>
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
            <img src="/logo.svg" alt="" className="size-5 object-contain" />
            <span className="text-body font-medium">Lux</span>
          </div>
        )}
        {isNarrow ? (
          <img src="/logo.svg" alt="" className="size-4 object-contain" />
        ) : (
          <Tooltip content={collapsed ? "Expand" : "Collapse"} side="right" prose>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="
                press cursor-pointer text-ink-3
                hover:bg-accent hover:text-ink
                grid size-8 place-items-center rounded-md
              "
            >
              <ChevronLeft
                className={cn(
                  "size-4 transition-transform duration-200",
                  collapsed && "rotate-180",
                )}
              />
            </button>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}
