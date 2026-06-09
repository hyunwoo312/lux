import { useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { RotateCcw, Search, TriangleAlert } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { shortcutsEqual, type Shortcut } from "@/lib/shortcuts";
import { SettingsSection } from "@/settings/components/SettingsSection";
import {
  MAX_SHORTCUT_SLOTS,
  SHORTCUT_DEFAULTS,
  SHORTCUT_DEFINITIONS,
  useShortcutsStore,
  type ShortcutAction,
} from "@/stores/useShortcutsStore";
import { CustomizeRow } from "@/settings/tabs/shortcuts/shared";
import { LAYOUT_TRANSITION, SLIDE_TRANSITION } from "@/settings/tabs/shortcuts/transitions";
import { AddShortcutControl, ShortcutDisplay } from "@/settings/tabs/shortcuts/ShortcutRow";

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

  const needle = query.trim().toLowerCase();
  const matches = (...parts: string[]) =>
    !needle || parts.join(" ").toLowerCase().includes(needle);

  const visibleShortcuts = SHORTCUT_DEFINITIONS.filter((action) =>
    matches(action.label, action.description),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="relative">
        <Search className="
          text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2
        " />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search shortcuts"
          spellCheck={false}
          className="
            border-border bg-background/40
            placeholder:text-muted-foreground/70
            focus-visible:ring-ring
            w-full rounded-lg border py-2 pr-3 pl-9 text-sm outline-none
            focus-visible:ring-2
          "
        />
      </div>

      {visibleShortcuts.length > 0 ? (
        <SettingsSection
          title="Shortcuts"
          description="Click a shortcut to rebind it, or add a second. Up to two per action."
          action={
            SHORTCUT_DEFINITIONS.some(
              (definition) => !sameBindings(shortcuts[definition.id], SHORTCUT_DEFAULTS[definition.id]),
            ) ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground h-7 gap-1.5 text-xs"
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
                    icon={<Icon className="text-muted-foreground size-6 shrink-0" />}
                    name={action.label}
                    description={action.description}
                  >
                    <AnimatePresence initial={false}>
                      {!isDefault && (
                        <motion.div
                          key="reset"
                          layout
                          initial={reduced ? false : { opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                          transition={LAYOUT_TRANSITION}
                        >
                          <Tooltip content="Reset to default" solid>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
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
                        transition={LAYOUT_TRANSITION}
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
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
                        transition={SLIDE_TRANSITION}
                        className="text-destructive flex items-center gap-1.5 pl-9 text-xs"
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
      ) : (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No shortcuts match “{query}”.
        </p>
      )}
    </div>
  );
}
