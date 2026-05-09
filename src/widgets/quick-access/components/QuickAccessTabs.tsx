import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Bookmark, History, Pin, Undo2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuickAccessTab } from "@/widgets/quick-access/types";
import { useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";

const TABS: { value: QuickAccessTab; label: string; icon: LucideIcon }[] = [
  { value: "home", label: "Pinned", icon: Pin },
  { value: "bookmarks", label: "Bookmarks", icon: Bookmark },
  { value: "recentlyClosed", label: "Recent", icon: Undo2 },
  { value: "history", label: "History", icon: History },
];

const UNDERLINE_INSET = 6;

type Indicator = { x: number; width: number };

export function QuickAccessTabs() {
  const activeTab = useQuickAccessStore((s) => s.activeTab);
  const setActiveTab = useQuickAccessStore((s) => s.setActiveTab);
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<QuickAccessTab, HTMLButtonElement>());
  const activeRef = useRef(activeTab);
  activeRef.current = activeTab;
  const [wide, setWide] = useState(true);
  const [indicator, setIndicator] = useState<Indicator | null>(null);

  const measure = useCallback(() => {
    const button = buttons.current.get(activeRef.current);
    if (!button) return;
    setIndicator({ x: button.offsetLeft, width: button.offsetWidth });
  }, []);

  useEffect(() => {
    const el = ref.current;
    const measurer = measureRef.current;
    if (!el || !measurer) return;
    const update = () => setWide(el.clientWidth >= measurer.scrollWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [activeTab, wide, measure]);

  useEffect(() => {
    const observer = new ResizeObserver(() => measure());
    buttons.current.forEach((button) => observer.observe(button));
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div ref={ref} role="tablist" className="relative flex w-full items-center gap-0.5">
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute flex items-center gap-0.5"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <span
              key={tab.value}
              className="flex items-center px-1.5 py-1 text-xs font-medium [&_svg]:size-3.5"
            >
              <Icon />
              <span className="pl-1.5">{tab.label}</span>
            </span>
          );
        })}
      </div>
      {indicator && (
        <motion.span
          aria-hidden
          className="bg-primary absolute -bottom-1 left-0 h-0.5 rounded-full"
          initial={false}
          animate={{
            x: indicator.x + UNDERLINE_INSET,
            width: Math.max(0, indicator.width - UNDERLINE_INSET * 2),
          }}
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 550, damping: 45 }}
        />
      )}
      {TABS.map((tab) => {
        const isActive = tab.value === activeTab;
        const Icon = tab.icon;
        return (
          <button
            key={tab.value}
            ref={(el) => {
              if (el) buttons.current.set(tab.value, el);
              else buttons.current.delete(tab.value);
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={tab.label}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              `
                relative flex cursor-pointer items-center rounded-md px-1.5 py-1 text-xs font-medium
                transition-colors
                [&_svg]:size-3.5
              `,
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon />
            <AnimatePresence initial={false}>
              {(isActive || wide) && (
                <motion.span
                  key="label"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "auto", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  <span className="pl-1.5">{tab.label}</span>
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        );
      })}
    </div>
  );
}
