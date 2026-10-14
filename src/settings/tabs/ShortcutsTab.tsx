import { useState, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { ExternalLink, RotateCcw, Search, TriangleAlert } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/SearchField";
import { Tooltip } from "@/components/ui/tooltip";
import { shortcutsEqual, type Shortcut } from "@/lib/shortcuts";
import {
  MAX_SHORTCUT_SLOTS,
  SHORTCUT_DEFAULTS,
  SHORTCUT_DEFINITIONS,
  useShortcutsStore,
  type ShortcutAction,
} from "@/stores/useShortcutsStore";
import { panelVariants, pop, springCrisp } from "@/lib/motion";
import { usePaletteShortcut } from "@/hooks/usePaletteShortcut";
import { AddShortcutControl, ShortcutDisplay } from "@/settings/tabs/ShortcutRow";
import { Kbd } from "@/components/Kbd";
import { ConfigSection, ConfigBody } from "@/components/config/Config";
import { matchesQuery } from "@/lib/utils";
import { BROWSER_SHORTCUT, SHORTCUTS } from "@/settings/rows";
import { useSettingsStore } from "@/stores/useSettingsStore";

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
  const destination = useSettingsStore((s) => s.destination);
  const clearDestination = useSettingsStore((s) => s.clearDestination);
  const visibleQuery = destination?.tab === "shortcuts" ? "" : query;
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

  const needle = visibleQuery.trim().toLowerCase();
  const visibleShortcuts = SHORTCUT_DEFINITIONS.filter((action) =>
    matchesQuery(`${action.label} ${action.description}`, needle),
  );
  const browserMatches =
    `${BROWSER_SHORTCUT.rows.palette.title} ${BROWSER_SHORTCUT.rows.palette.description}`
      .toLowerCase()
      .includes(needle);

  return (
    <ConfigBody>
      <SearchField
        value={visibleQuery}
        onChange={(value) => {
          clearDestination();
          setQuery(value);
        }}
        label="Search shortcuts"
      />

      {browserMatches && (
        <ConfigSection settingId={BROWSER_SHORTCUT.settingId} title={BROWSER_SHORTCUT.title}>
          <CustomizeRow
            settingId={BROWSER_SHORTCUT.rows.palette.settingId}
            icon={<Search className="text-ink-3 size-6 shrink-0" />}
            name={BROWSER_SHORTCUT.rows.palette.title}
            description={BROWSER_SHORTCUT.rows.palette.description}
          >
            {paletteShortcut.status === "unbound" && (
              <span className="text-ink-3 text-caption">Not assigned</span>
            )}
            {paletteShortcut.status === "bound" && <Kbd>{paletteShortcut.shortcut}</Kbd>}
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
        </ConfigSection>
      )}

      {visibleShortcuts.length > 0 && (
        <ConfigSection
          settingId={SHORTCUTS.settingId}
          title={SHORTCUTS.title}
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
                <div
                  key={action.id}
                  data-setting-id={`${SHORTCUTS.settingId}.${action.id}`}
                  tabIndex={-1}
                  className="flex scroll-m-4 flex-col gap-1"
                >
                  <CustomizeRow
                    icon={<Icon className="text-ink-3 size-6 shrink-0" />}
                    name={action.label}
                    description={action.description}
                  >
                    <AnimatePresence initial={false}>
                      {!isDefault && (
                        <motion.div key="reset" layout {...pop(reduced)}>
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
                        className="flex max-w-full flex-wrap items-center gap-1.5"
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
                        variants={panelVariants(reduced)}
                        initial="hidden"
                        animate="show"
                        exit="exit"
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
        </ConfigSection>
      )}

      {!browserMatches && visibleShortcuts.length === 0 && (
        <p className="text-ink-3 py-8 text-center text-body">No shortcuts match “{query}”.</p>
      )}
    </ConfigBody>
  );
}

function CustomizeRow({
  settingId,
  icon,
  name,
  description,
  children,
}: {
  settingId?: string;
  icon: ReactNode;
  name: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div
      data-setting-id={settingId}
      tabIndex={settingId ? -1 : undefined}
      className="
        hover:bg-accent/40
        -mx-2 grid scroll-m-4 grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2
        rounded-lg px-2 py-3 transition-colors
        @min-[28rem]:grid-cols-[1.5rem_minmax(0,1fr)_auto]
      "
    >
      {icon}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body font-medium">{name}</span>
        <span className="text-ink-3 text-caption">{description}</span>
      </div>
      <div
        className="
          col-start-2 flex min-w-0 flex-wrap items-center gap-1.5
          @min-[28rem]:col-start-auto
        "
      >
        {children}
      </div>
    </div>
  );
}
