import type { ComponentType } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Dialog } from "@/components/ui/dialog";
import { DialogHeaderBar, RailDialogContent } from "@/components/DialogChrome";
import { SettingsSidebar } from "@/settings/components/SettingsSidebar";
import { fade } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { SettingsSearch } from "@/settings/components/SettingsSearch";
import { SettingsPanel } from "@/settings/components/SettingsPanel";
import { AboutTab } from "@/settings/tabs/AboutTab";
import { AccountsTab } from "@/settings/tabs/AccountsTab";
import { AppearanceTab } from "@/settings/tabs/AppearanceTab";
import { ShortcutsTab } from "@/settings/tabs/ShortcutsTab";
import { PaletteTab } from "@/settings/tabs/PaletteTab";
import { StorageTab } from "@/settings/tabs/StorageTab";
import { WidgetsTab } from "@/settings/tabs/WidgetsTab";
import { SETTINGS_TAB_META } from "@/settings/tabsMeta";
import type { SettingsTab } from "@/stores/settingsTabs";
import { SETTINGS_TABS, useSettingsStore } from "@/stores/useSettingsStore";

const TAB_COMPONENTS: Record<SettingsTab, ComponentType> = {
  appearance: AppearanceTab,
  widgets: WidgetsTab,
  accounts: AccountsTab,
  shortcuts: ShortcutsTab,
  palette: PaletteTab,
  storage: StorageTab,
  about: AboutTab,
};

export function SettingsDialog() {
  const open = useSettingsStore((s) => s.open);
  const tab = useSettingsStore((s) => s.tab);
  const closeSettings = useSettingsStore((s) => s.closeSettings);
  const searchOpen = useSettingsStore((s) => s.searchOpen);
  const searchQuery = useSettingsStore((s) => s.searchQuery);
  const openSearch = useSettingsStore((s) => s.openSearch);
  const closeSearch = useSettingsStore((s) => s.closeSearch);
  const visited = useSettingsStore((s) => s.visitedTabs);
  const destination = useSettingsStore((s) => s.destination);
  const reduced = useReducedMotion();

  const active = SETTINGS_TAB_META[tab];
  const ActiveIcon = active.icon;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeSettings();
      }}
    >
      <RailDialogContent
        initialFocus="container"
        width="xl"
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
            event.preventDefault();
            const inlineSearch = document.querySelector<HTMLInputElement>(
              'input[aria-label="Search settings"]',
            );
            if (inlineSearch && inlineSearch.getBoundingClientRect().width > 0) {
              inlineSearch.focus();
              return;
            }
            openSearch();
            document.querySelector<HTMLInputElement>('input[aria-label="Find a setting"]')?.focus();
          }
        }}
        onEscapeKeyDown={(event) => {
          if (!searchOpen) return;
          event.preventDefault();
          if (
            document.activeElement instanceof HTMLInputElement &&
            document.activeElement.type === "search" &&
            searchQuery
          )
            return;
          closeSearch();
          document.getElementById("settings-search-trigger")?.focus();
        }}
      >
        <SettingsSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <DialogHeaderBar>
            <div className="relative min-w-0 flex-1 overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={searchOpen ? "search" : tab}
                  {...fade(reduced, "fast")}
                  className="flex min-w-0 items-center gap-2.5"
                >
                  {!searchOpen && destination && searchQuery && (
                    <Tooltip content="Back to search results" prose>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Back to search results"
                        onClick={openSearch}
                      >
                        <ArrowLeft />
                      </Button>
                    </Tooltip>
                  )}
                  {searchOpen ? (
                    <Search className="text-ink-3 size-4 shrink-0" aria-hidden />
                  ) : (
                    <ActiveIcon className="text-ink-3 size-4 shrink-0" aria-hidden />
                  )}
                  <h2 className="min-w-0 truncate text-body font-semibold">
                    {searchOpen ? "Search settings" : active.label}
                  </h2>
                </motion.div>
              </AnimatePresence>
            </div>
          </DialogHeaderBar>

          {searchOpen && (
            <motion.div {...fade(reduced, "fast")} className="flex min-h-0 flex-1 flex-col">
              <SettingsSearch />
            </motion.div>
          )}
          {SETTINGS_TABS.filter((id) => visited.includes(id) || id === tab).map((id) => {
            const Content = TAB_COMPONENTS[id];
            return (
              <SettingsPanel key={id} tab={id} active={!searchOpen && tab === id}>
                <Content />
              </SettingsPanel>
            );
          })}
        </div>
      </RailDialogContent>
    </Dialog>
  );
}
