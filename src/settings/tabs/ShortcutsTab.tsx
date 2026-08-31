import { useState, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { ExternalLink, RotateCcw, Search, TriangleAlert } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/SearchField";
import { Tooltip } from "@/components/ui/tooltip";
import { shortcutsEqual, type Shortcut } from "@/lib/shortcuts";
import { SettingsSection } from "@/settings/components/SettingsSection";
import { SettingsTabBody } from "@/settings/components/SettingsTabBody";
import {
  MAX_SHORTCUT_SLOTS,
  SHORTCUT_DEFAULTS,
  SHORTCUT_DEFINITIONS,
  useShortcutsStore,
  type ShortcutAction,
} from "@/stores/useShortcutsStore";
import { EASE_OUT_STRONG, enterTween, exitTween, springCrisp } from "@/lib/motion";
import { usePaletteShortcut } from "@/hooks/usePaletteShortcut";
import { AddShortcutControl, ShortcutDisplay } from "@/settings/tabs/ShortcutRow";

const BROWSER_SHORTCUT = {
  label: "Open the command palette",
  description: "Works from any tab; rebind it in Chrome",
} as const;

function openBrowserShortcuts(): void {
  if (typeof chrome === "undefined" || !chrome.tabs) return;
  void chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
}

function sameBindings(a: Shortcut[], b: Shortcut[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((shortcut, index) => {
    const other = b[index];
    return other ? shortcutsEqual(shortcut, other) : false;
  });
}

export function ShortcutsTab() {
  const [query, setQuery] = useState("");
  const shortcuts = useShortcutsStore(
    useShallow(
      (s) =>
        Object.fromEntries(SHORTCUT_DEFINITIONS.map((d) => [d.id, s[d.id]])) as Record<
          ShortcutAction,
          Shortcut[]
        >,
    ),
  );
  const setShortcutSlot = useShortcutsStore((s) => s.setShortcutSlot);
  const clearShortcutSlot = useShortcutsStore((s) => s.clearShortcutSlot);
  const resetShortcut = useShortcutsStore((s) => s.resetShortcut);
  const resetAll = useShortcutsStore((s) => s.resetAll);
  const reduced = useReducedMotion();
  const paletteShortcut = usePaletteShortcut();

  const needle = query.trim().toLowerCase();
  const visibleShortcuts = SHORTCUT_DEFINITIONS.filter((action) =>
    `${action.label} ${action.description}`.toLowerCase().includes(needle),
  );
  const browserMatches = `${BROWSER_SHORTCUT.label} ${BROWSER_SHORTCUT.description}`
    .toLowerCase()
    .includes(needle);

  return (
    <SettingsTabBody>
      <SearchField value={query} onChange={setQuery} label="Search shortcuts" />

      {browserMatches && (
        <SettingsSection title="Browser shortcut">
          <CustomizeRow
            icon={<Search className="text-ink-3 size-6 shrink-0" />}
            name={BROWSER_SHORTCUT.label}
            description={BROWSER_SHORTCUT.description}
          >
            {paletteShortcut === undefined ? (
              <span className="text-ink-3 text-caption">Not assigned</span>
            ) : (
              <kbd className="text-ink font-sans text-caption font-semibold">{paletteShortcut}</kbd>
            )}
            <Button
              variant="ghost"
              size="xs"
              className="text-ink-3 hover:text-ink gap-1.5"
              onClick={openBrowserShortcuts}
            >
              <ExternalLink className="size-3.5" />
              Change in Chrome
            </Button>
          </CustomizeRow>
        </SettingsSection>
      )}

      {visibleShortcuts.length > 0 && (
        <SettingsSection
          title="Shortcuts"
          action={
            SHORTCUT_DEFINITIONS.some(
              (definition) =>
                !sameBindings(shortcuts[definition.id], SHORTCUT_DEFAULTS[definition.id]),
            ) ? (
              <Button
                variant="ghost"
                size="xs"
                className="text-ink-3 hover:text-ink gap-1.5"
                onClick={resetAll}
              >
                <RotateCcw className="size-3.5" />
                Reset all
              </Button>
            ) : undefined
          }
        >
          <div className="flex flex-col gap-0.5">
            {visibleShortcuts.map((action) => {
              const bindings = shortcuts[action.id];
              const isDefault = sameBindings(bindings, SHORTCUT_DEFAULTS[action.id]);
              const conflict = SHORTCUT_DEFINITIONS.find(
                (other) =>
                  other.id !== action.id &&
                  shortcuts[other.id].some((a) => bindings.some((b) => shortcutsEqual(a, b))),
              );
              const Icon = action.icon;
              return (
                <div key={action.id} className="flex flex-col gap-1">
                  <CustomizeRow
                    icon={<Icon className="text-ink-3 size-6 shrink-0" />}
                    name={action.label}
                    description={action.description}
                  >
                    <AnimatePresence initial={false}>
                      {!isDefault && (
                        <motion.div
                          key="reset"
                          layout
                          initial={reduced ? false : { opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1, transition: springCrisp(reduced) }}
                          exit={{
                            opacity: 0,
                            scale: reduced ? 1 : 0.8,
                            transition: exitTween(reduced, "fast"),
                          }}
                        >
                          <Tooltip content="Reset to default" prose>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={`Reset ${action.label} shortcut`}
                              onClick={() => resetShortcut(action.id)}
                            >
                              <RotateCcw className="size-4" />
                            </Button>
                          </Tooltip>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <LayoutGroup>
                      <motion.div
                        layout
                        transition={springCrisp(reduced)}
                        className="flex items-center gap-1.5"
                      >
                        {bindings.map((binding, slot) => (
                          <ShortcutDisplay
                            key={slot}
                            value={binding}
                            label={`${action.label} shortcut ${slot + 1}`}
                            onChange={(shortcut) => setShortcutSlot(action.id, slot, shortcut)}
                            onClear={() => clearShortcutSlot(action.id, slot)}
                          />
                        ))}
                        {bindings.length < MAX_SHORTCUT_SLOTS && (
                          <AddShortcutControl
                            label={action.label}
                            onAdd={(shortcut) =>
                              setShortcutSlot(action.id, bindings.length, shortcut)
                            }
                          />
                        )}
                      </motion.div>
                    </LayoutGroup>
                  </CustomizeRow>
                  <AnimatePresence initial={false}>
                    {conflict && (
                      <motion.p
                        key="conflict"
                        initial={reduced ? false : { opacity: 0, y: -4 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          transition: enterTween(reduced, "fast", EASE_OUT_STRONG),
                        }}
                        exit={{
                          opacity: 0,
                          y: reduced ? 0 : -4,
                          transition: exitTween(reduced, "fast", EASE_OUT_STRONG),
                        }}
                        className="text-destructive flex items-center gap-1.5 pl-9 text-caption"
                      >
                        <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
                        Also used by {conflict.label}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </SettingsSection>
      )}

      {!browserMatches && visibleShortcuts.length === 0 && (
        <p className="text-ink-3 py-8 text-center text-body">No shortcuts match “{query}”.</p>
      )}
    </SettingsTabBody>
  );
}

function CustomizeRow({
  icon,
  name,
  description,
  children,
}: {
  icon: ReactNode;
  name: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div
      className="
        hover:bg-accent/40
        -mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors
      "
    >
      {icon}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-body font-medium">{name}</span>
        <span className="text-ink-3 truncate text-caption">{description}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">{children}</div>
    </div>
  );
}
