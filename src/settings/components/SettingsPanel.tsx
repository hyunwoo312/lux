import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { enterTween, RESET_MS } from "@/lib/motion";
import { resolveSettingDestination } from "@/settings/destination";
import { useSettingsStore, type SettingsTab } from "@/stores/useSettingsStore";
import type { SettingEntry } from "@/settings/searchIndex";

type Highlight = { left: number; top: number; width: number; height: number };

export function SettingsPanel({
  tab,
  active,
  children,
}: {
  tab: SettingsTab;
  active: boolean;
  children: ReactNode;
}) {
  const destination = useSettingsStore((s) => s.destination);
  const reduced = useReducedMotion();
  const content = useRef<HTMLDivElement>(null);
  const [landing, setLanding] = useState<{
    entry: SettingEntry;
    rect: Highlight;
    hint?: string;
  } | null>(null);
  const [highlightVisible, setHighlightVisible] = useState(false);
  const current = destination === landing?.entry ? landing : null;

  useLayoutEffect(() => {
    if (!active || !destination || destination.tab !== tab || !content.current) return;
    const found = resolveSettingDestination(content.current, destination);
    if (!found) return;
    found.target.focus({ preventScroll: true });
    found.target.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
    const root = content.current.getBoundingClientRect();
    const rect = found.target.getBoundingClientRect();
    setLanding({
      entry: destination,
      hint: found.hint,
      rect: {
        left: rect.left - root.left,
        top: rect.top - root.top,
        width: rect.width,
        height: rect.height,
      },
    });
    setHighlightVisible(true);
    const timer = window.setTimeout(() => setHighlightVisible(false), RESET_MS);
    return () => window.clearTimeout(timer);
  }, [active, destination, reduced, tab]);

  return (
    <div
      id={`settings-panel-${tab}`}
      role="tabpanel"
      aria-labelledby={`settings-tab-${tab}`}
      hidden={!active}
      className="
        relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto scroll-fade scrollbar-inset-b px-4
        py-5
        sm:px-6
      "
    >
      {active && current?.hint && (
        <p
          role="status"
          className="
            border-primary/20 bg-primary/8 text-ink-2 mb-4 rounded-lg border px-3 py-2 text-caption
          "
        >
          {current.hint}
        </p>
      )}
      <motion.div
        ref={content}
        initial={{ opacity: 0, y: reduced ? 0 : 8 }}
        animate={{ opacity: active ? 1 : 0, y: active || reduced ? 0 : 8 }}
        transition={enterTween(reduced, "fast")}
        className="@container relative"
      >
        {children}
        {active && current && highlightVisible && (
          <motion.span
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: reduced ? 1 : [0, 1, 1, 0] }}
            transition={
              reduced ? { duration: 0 } : { duration: RESET_MS / 1000, times: [0, 0.1, 0.7, 1] }
            }
            style={current.rect}
            className="
              bg-primary/8 ring-primary/30 pointer-events-none absolute rounded-lg ring-2 ring-inset
            "
          />
        )}
      </motion.div>
    </div>
  );
}
