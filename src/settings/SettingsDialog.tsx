import type { ComponentType } from "react";
import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DialogHeaderBar } from "@/components/DialogChrome";
import { SettingsSidebar } from "@/settings/components/SettingsSidebar";
import { EASE_OUT_STRONG, enterTween, exitTween } from "@/lib/motion";
import { AboutTab } from "@/settings/tabs/AboutTab";
import { AccountsTab } from "@/settings/tabs/AccountsTab";
import { AppearanceTab } from "@/settings/tabs/AppearanceTab";
import { ShortcutsTab } from "@/settings/tabs/ShortcutsTab";
import { PaletteTab } from "@/settings/tabs/PaletteTab";
import { StorageTab } from "@/settings/tabs/StorageTab";
import { WidgetsTab } from "@/settings/tabs/WidgetsTab";
import { SETTINGS_TAB_META, type SettingsTab } from "@/settings/tabsMeta";
import { SETTINGS_TABS, useSettingsStore } from "@/settings/useSettingsStore";

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
  const reduced = useReducedMotion();

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
      center: { x: 0, opacity: 1, transition: enterTween(reduced, "slow", EASE_OUT_STRONG) },
      exit: (dir: number) => ({
        x: reduced ? 0 : dir * -120,
        opacity: 0,
        transition: exitTween(reduced, "slow", EASE_OUT_STRONG),
      }),
    }),
    [reduced],
  );

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
        width="xl"
        className="h-[90dvh]"
      >
        <div className="flex min-h-0 flex-1">
          <SettingsSidebar open={open} />

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
