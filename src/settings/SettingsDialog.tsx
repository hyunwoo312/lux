import type { ComponentType, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import { ChevronLeft, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DIALOG_RAIL, DialogHeaderBar } from "@/components/DialogChrome";
import { SearchField } from "@/components/SearchField";
import { searchSettings } from "@/settings/searchIndex";
import { Separator } from "@/components/ui/separator";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { EASE_OUT_STRONG, SPRING_CRISP } from "@/lib/motion";
import { AboutTab } from "@/settings/tabs/AboutTab";
import { AccountsTab } from "@/settings/tabs/AccountsTab";
import { AppearanceTab } from "@/settings/tabs/AppearanceTab";
import { ShortcutsTab } from "@/settings/tabs/ShortcutsTab";
import { StorageTab } from "@/settings/tabs/StorageTab";
import { WidgetsTab } from "@/settings/tabs/WidgetsTab";
import { SETTINGS_TAB_META, type SettingsTab } from "@/settings/tabsMeta";
import { SETTINGS_TABS, useSettingsStore } from "@/settings/useSettingsStore";

const TAB_COMPONENTS: Record<SettingsTab, ComponentType> = {
  appearance: AppearanceTab,
  widgets: WidgetsTab,
  accounts: AccountsTab,
  shortcuts: ShortcutsTab,
  storage: StorageTab,
  about: AboutTab,
};

export function SettingsDialog() {
  const open = useSettingsStore((s) => s.open);
  const tab = useSettingsStore((s) => s.tab);
  const setTab = useSettingsStore((s) => s.setTab);
  const closeSettings = useSettingsStore((s) => s.closeSettings);
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar);
  const reduced = useReducedMotion();

  const [query, setQuery] = useState("");
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 640px)");
    const update = () => setIsNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const results = searchSettings(query);
  const searching = query.trim().length > 0;

  const tabIndex = SETTINGS_TABS.indexOf(tab);
  const prevIndexRef = useRef(tabIndex);
  const wasOpenRef = useRef(open);
  const justOpened = open && !wasOpenRef.current;
  const direction = justOpened ? 0 : Math.sign(tabIndex - prevIndexRef.current);
  useEffect(() => {
    prevIndexRef.current = tabIndex;
    wasOpenRef.current = open;
  }, [tabIndex, open]);

  const carouselVariants = useMemo<Variants>(
    () => ({
      enter: (dir: number) => ({ x: reduced ? 0 : dir * 120, opacity: 0 }),
      center: { x: 0, opacity: 1 },
      exit: (dir: number) => ({ x: reduced ? 0 : dir * -120, opacity: 0 }),
    }),
    [reduced],
  );

  const transition = useMemo<Transition>(
    () => ({ duration: reduced ? 0 : 0.3, ease: EASE_OUT_STRONG }),
    [reduced],
  );

  const onTabKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    const jump = event.key === "Home" ? 0 : event.key === "End" ? SETTINGS_TABS.length - 1 : null;
    if (step === 0 && jump === null) return;

    event.preventDefault();
    const index = jump ?? (tabIndex + step + SETTINGS_TABS.length) % SETTINGS_TABS.length;
    const next = SETTINGS_TABS[index];
    if (!next) return;
    setTab(next);
    document.getElementById(`settings-tab-${next}`)?.focus();
  };

  const effectiveCollapsed = isNarrow || collapsed;
  const active = SETTINGS_TAB_META[tab];
  const ActiveIcon = active.icon;
  const ActiveTab = TAB_COMPONENTS[tab];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeSettings();
      }}
    >
      <DialogContent
        showClose={false}
        onOpenAutoFocus={(event) => event.preventDefault()}
        layout="flush"
        className="h-[90dvh] w-[min(52rem,calc(100vw-2rem))]"
      >
        <div className="flex min-h-0 flex-1">
          <aside
            className={cn(
              DIALOG_RAIL,
              "overflow-hidden transition-[width] duration-200 ease-out",
              effectiveCollapsed ? "w-[3.25rem]" : "w-56",
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
                {results.length === 0 ? (
                  <p className="text-ink-4 px-2 py-3 text-caption">No settings match that.</p>
                ) : (
                  results.map((entry) => (
                    <button
                      key={`${entry.tab}-${entry.label}`}
                      type="button"
                      onClick={() => {
                        setTab(entry.tab);
                        setQuery("");
                      }}
                      className="
                        press-row focus-ring
                        hover:bg-accent/50
                        flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-lg px-2
                        py-1.5 text-left transition-colors
                      "
                    >
                      <span className="text-ink text-caption font-medium">{entry.label}</span>
                      <span className="text-ink-4 text-micro">
                        {SETTINGS_TAB_META[entry.tab].label} · {entry.section}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <nav
                role="tablist"
                aria-orientation="vertical"
                aria-label="Settings sections"
                onKeyDown={onTabKeyDown}
                className="flex flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto p-2"
              >
                {SETTINGS_TABS.map((id) => {
                  const { label, icon: Icon } = SETTINGS_TAB_META[id];
                  const isActive = id === tab;
                  const button = (
                    <button
                      type="button"
                      role="tab"
                      id={`settings-tab-${id}`}
                      aria-selected={isActive}
                      aria-controls="settings-panel"
                      tabIndex={isActive ? 0 : -1}
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
                          className="
                            bg-primary/12 ring-primary/25 absolute inset-0 rounded-lg ring-1
                          "
                          transition={reduced ? { duration: 0 } : SPRING_CRISP}
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
                        <Tooltip content={label} side="right" solid>
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
                <Tooltip content={collapsed ? "Expand" : "Collapse"} side="right" solid>
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

          <div className="flex min-w-0 flex-1 flex-col">
            <DialogHeaderBar>
              <div className="relative min-w-0 flex-1 overflow-hidden">
                <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                  <motion.div
                    key={tab}
                    custom={direction}
                    variants={carouselVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={transition}
                    className="flex min-w-0 items-center gap-2.5"
                  >
                    <ActiveIcon className="text-ink-3 size-4 shrink-0" aria-hidden />
                    <h2 className="text-body font-semibold whitespace-nowrap">{active.label}</h2>
                  </motion.div>
                </AnimatePresence>
              </div>
            </DialogHeaderBar>
            <div
              id="settings-panel"
              role="tabpanel"
              aria-labelledby={`settings-tab-${tab}`}
              className="
                relative min-h-0 flex-1 overflow-x-hidden scroll-fade scrollbar-inset-b
                overflow-y-auto px-6 py-5
                [&_section:first-child>:first-child]:hidden
              "
            >
              <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                <motion.div
                  key={tab}
                  custom={direction}
                  variants={carouselVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={transition}
                  className="will-change-transform"
                >
                  <ActiveTab />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
