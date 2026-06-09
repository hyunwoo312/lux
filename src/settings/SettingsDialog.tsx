import type { ComponentType, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import { ChevronLeft, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AboutTab } from "@/settings/tabs/AboutTab";
import { AccountsTab } from "@/settings/tabs/AccountsTab";
import { GeneralTab } from "@/settings/tabs/GeneralTab";
import { HelpTab } from "@/settings/tabs/HelpTab";
import { ShortcutsTab } from "@/settings/tabs/ShortcutsTab";
import { SETTINGS_TAB_META, type SettingsTab } from "@/settings/tabsMeta";
import { SETTINGS_TABS, useSettingsStore } from "@/settings/useSettingsStore";

const TAB_COMPONENTS: Record<SettingsTab, ComponentType> = {
  general: GeneralTab,
  accounts: AccountsTab,
  shortcuts: ShortcutsTab,
  help: HelpTab,
  about: AboutTab,
};

const FADE = "2.75rem";

export function SettingsDialog() {
  const open = useSettingsStore((s) => s.open);
  const tab = useSettingsStore((s) => s.tab);
  const setTab = useSettingsStore((s) => s.setTab);
  const closeSettings = useSettingsStore((s) => s.closeSettings);
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar);
  const reduced = useReducedMotion();

  const [isNarrow, setIsNarrow] = useState(false);
  const [mask, setMask] = useState<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 640px)");
    const update = () => setIsNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const updateMask = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const up = el.scrollTop > 2;
    const down = el.scrollTop + el.clientHeight < el.scrollHeight - 2;
    if (!up && !down) {
      setMask(undefined);
      return;
    }
    const top = up ? `transparent 0, black ${FADE}` : "black 0";
    const bottom = down ? `black calc(100% - ${FADE}), transparent 100%` : "black 100%";
    setMask(`linear-gradient(to bottom, ${top}, ${bottom})`);
  }, []);

  useEffect(() => {
    updateMask();
    const onResize = () => updateMask();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [updateMask, tab, open]);

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
    () => ({ duration: reduced ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }),
    [reduced],
  );

  const effectiveCollapsed = isNarrow || collapsed;
  const active = SETTINGS_TAB_META[tab];
  const ActiveTab = TAB_COMPONENTS[tab];
  const ActiveIcon = active.icon;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeSettings();
      }}
    >
      <DialogContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="
          glass-panel flex h-[80dvh] w-[min(52rem,calc(100vw-2rem))] gap-0 overflow-hidden
          bg-transparent p-0
        "
      >

        <aside
          className={cn(
            `
              border-border/60 flex shrink-0 flex-col overflow-hidden border-r
              bg-[var(--glass-bg-thick)] transition-[width] duration-200 ease-out
            `,
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
                "text-sm font-semibold whitespace-nowrap transition-opacity duration-200",
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

          <nav className="flex flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto p-2">
            {SETTINGS_TABS.map((id) => {
              const { label, icon: Icon } = SETTINGS_TAB_META[id];
              const isActive = id === tab;
              const button = (
                <button
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    `
                      relative flex w-full items-center rounded-lg px-2 py-2 text-sm
                      whitespace-nowrap
                    `,
                    isActive ? "text-foreground" : "text-muted-foreground hover:bg-accent/50",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="settings-active-tab"
                      className="bg-accent absolute inset-0 rounded-lg"
                      transition={
                        reduced
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 480, damping: 40 }
                      }
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-4">
                    <Icon className="size-5 shrink-0" />
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

          <div
            className={cn(
              "border-border/60 flex h-12 shrink-0 items-center border-t px-2",
              effectiveCollapsed ? "justify-center" : "justify-between",
            )}
          >
            {!effectiveCollapsed && (
              <div className="flex items-center gap-4 pl-2">
                <img src="/logo.svg" alt="" className="size-5 object-contain" />
                <span className="text-sm font-medium">Lux</span>
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
                    text-muted-foreground
                    hover:bg-accent hover:text-foreground
                    grid size-8 place-items-center rounded-lg transition-colors
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

        <div className="bg-popover/90 flex min-w-0 flex-1 flex-col">
          <header className="
            border-border/60 relative flex h-[4.25rem] shrink-0 items-center overflow-hidden
            border-b px-6
          ">
            <AnimatePresence mode="popLayout" custom={direction} initial={false}>
              <motion.div
                key={tab}
                custom={direction}
                variants={carouselVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={transition}
                className="flex items-center gap-3"
              >
                <ActiveIcon className="text-primary size-5 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-base font-semibold">{active.label}</h2>
                  <p className="text-muted-foreground text-sm">{active.description}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </header>
          <div
            ref={scrollRef}
            onScroll={updateMask}
            style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
            className="
              relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-6 py-5
              [&_section:first-child>:first-child]:hidden
            "
          >
            <AnimatePresence mode="popLayout" custom={direction} initial={false}>
              <SlidingPane
                key={tab}
                direction={direction}
                variants={carouselVariants}
                transition={transition}
                defer={!reduced && direction !== 0}
                onSettled={updateMask}
              >
                <ActiveTab />
              </SlidingPane>
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type SlidingPaneProps = {
  direction: number;
  variants: Variants;
  transition: Transition;
  defer: boolean;
  onSettled: () => void;
  children: ReactNode;
};

function SlidingPane({
  direction,
  variants,
  transition,
  defer,
  onSettled,
  children,
}: SlidingPaneProps) {
  const [settled, setSettled] = useState(!defer);

  useEffect(() => {
    if (settled) onSettled();
  }, [settled, onSettled]);

  return (
    <motion.div
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={transition}
      onAnimationComplete={() => setSettled(true)}
      className="will-change-transform"
    >
      {settled ? children : null}
    </motion.div>
  );
}
