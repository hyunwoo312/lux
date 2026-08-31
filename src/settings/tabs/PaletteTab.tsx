import { RefreshCw, TriangleAlert } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ConfigSegmented } from "@/components/config/WidgetConfig";
import { commandCatalogue } from "@/commands";
import { useGrantedPermissions } from "@/hooks/usePermission";
import { isPermissionsManageable, setPermissionsGranted } from "@/lib/permissions";
import { OPEN_BEHAVIOR_OPTIONS } from "@/lib/open-url";
import { SettingsRow } from "@/settings/components/SettingsRow";
import { SettingsSection } from "@/settings/components/SettingsSection";
import { SettingsTabBody } from "@/settings/components/SettingsTabBody";
import { SliderField } from "@/settings/components/SliderField";
import {
  PALETTE_SOURCES,
  PALETTE_SOURCE_LABELS,
  SUGGESTION_MAX,
  SUGGESTION_MIN,
  usePaletteStore,
  type PaletteSource,
} from "@/stores/usePaletteStore";

type SourceMeta = {
  description: string;
  permission?: chrome.runtime.ManifestPermission;
};

const SOURCE_META: Record<PaletteSource, SourceMeta> = {
  bookmarks: { description: "Search the bookmarks you have saved.", permission: "bookmarks" },
  history: { description: "Offer pages you have visited before.", permission: "history" },
  openTabs: { description: "Switch to a tab you already have open.", permission: "tabs" },
  topSites: { description: "Offer the sites you visit most.", permission: "topSites" },
  webSearch: { description: "Send what you typed to your search engine, Claude or ChatGPT." },
};

export function PaletteTab() {
  const enabled = usePaletteStore(useShallow((s) => s.enabled));
  const disabled = usePaletteStore(useShallow((s) => s.disabledCommands));
  const suggestionsEnabled = usePaletteStore((s) => s.suggestionsEnabled);
  const suggestionCount = usePaletteStore((s) => s.suggestionCount);
  const openIn = usePaletteStore((s) => s.openIn);
  const usageCount = usePaletteStore((s) => Object.keys(s.usage).length);
  const setSourceEnabled = usePaletteStore((s) => s.setSourceEnabled);
  const setCommandsEnabled = usePaletteStore((s) => s.setCommandsEnabled);
  const setSuggestionsEnabled = usePaletteStore((s) => s.setSuggestionsEnabled);
  const setSuggestionCount = usePaletteStore((s) => s.setSuggestionCount);
  const setOpenIn = usePaletteStore((s) => s.setOpenIn);
  const clearUsage = usePaletteStore((s) => s.clearUsage);
  const granted = useGrantedPermissions();
  const manageable = isPermissionsManageable();

  const isGranted = (source: PaletteSource) => {
    const permission = SOURCE_META[source].permission;
    return permission === undefined || (granted !== null && granted.has(permission));
  };
  const missing = PALETTE_SOURCES.filter((source) => enabled[source] && !isGranted(source));

  return (
    <SettingsTabBody>
      {missing.length > 0 && (
        <p
          role="status"
          className="
            border-border bg-foreground/4 text-ink-2 text-caption flex items-start gap-2 rounded-lg
            border px-3 py-2.5
          "
        >
          <TriangleAlert className="text-ink-2 mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {missing.length === 1 ? "One source is" : `${missing.length} sources are`} switched on
            but cannot be read until you allow it. The palette leaves them out until then.
          </span>
        </p>
      )}

      <SettingsSection title="Suggestions">
        <SettingsRow
          title="Suggested commands"
          description="Puts what you reach for most at the top, before everything else"
          control={
            <Switch
              checked={suggestionsEnabled}
              aria-label="Suggested commands"
              onCheckedChange={setSuggestionsEnabled}
            />
          }
        />
        {suggestionsEnabled && (
          <SettingsRow
            title="How many to show"
            description="At the top of the palette before anything else"
            control={
              <SliderField
                hideLabel
                label="How many to show"
                value={suggestionCount}
                min={SUGGESTION_MIN}
                max={SUGGESTION_MAX}
                step={1}
                display={String(suggestionCount)}
                className="w-56"
                onChange={setSuggestionCount}
              />
            }
          />
        )}
        <SettingsRow
          title="Learned ranking"
          description={
            usageCount === 0
              ? "Nothing learned yet"
              : `Learned from ${usageCount} ${usageCount === 1 ? "command" : "commands"} you have run`
          }
          control={
            <Button variant="outline" disabled={usageCount === 0} onClick={clearUsage}>
              <RefreshCw aria-hidden />
              Clear ranking
            </Button>
          }
        />
      </SettingsSection>

      <SettingsSection title="Results">
        <SettingsRow
          title="Where results open"
          description="Whether picking a link or a search replaces this tab"
          control={
            <ConfigSegmented
              label="Where results open"
              value={openIn}
              options={OPEN_BEHAVIOR_OPTIONS}
              onChange={setOpenIn}
            />
          }
        />
      </SettingsSection>

      <SettingsSection title="Browser data and search">
        {PALETTE_SOURCES.map((source) => {
          const meta = SOURCE_META[source];
          const permission = meta.permission;
          const needsGrant = enabled[source] && !isGranted(source);
          return (
            <SettingsRow
              key={source}
              title={PALETTE_SOURCE_LABELS[source]}
              description={meta.description}
              control={
                <div className="flex items-center gap-2">
                  {needsGrant && permission !== undefined && (
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={!manageable}
                      aria-label={`Allow ${PALETTE_SOURCE_LABELS[source]}`}
                      onClick={() =>
                        void setPermissionsGranted([permission], true, { reopenSettings: true })
                      }
                    >
                      Allow
                    </Button>
                  )}
                  <Switch
                    checked={enabled[source]}
                    aria-label={PALETTE_SOURCE_LABELS[source]}
                    onCheckedChange={(value) => setSourceEnabled(source, value)}
                  />
                </div>
              }
            />
          );
        })}
      </SettingsSection>

      <SettingsSection title="Commands">
        <p className="text-ink-2 text-caption">
          Everything the palette can offer. Uncheck what you would rather it never showed.
        </p>
        {commandCatalogue().map((group) => {
          const ids = group.commands.map((command) => command.id);
          const on = ids.filter((id) => disabled[id] !== true).length;
          return (
            <div key={group.id} className="bg-foreground/4 flex flex-col gap-2 rounded-lg p-3">
              <label
                className="
                  border-border flex cursor-pointer items-center gap-2.5 border-b px-1.5 pb-2
                "
              >
                <group.icon className="text-ink-2 size-4 shrink-0" aria-hidden />
                <span className="text-ink truncate text-body font-medium">{group.label}</span>
                {group.setup && (
                  <Button
                    size="xs"
                    variant="outline"
                    className="ml-1 shrink-0"
                    onClick={(event) => {
                      event.preventDefault();
                      group.setup?.run();
                    }}
                  >
                    {group.setup.reason}
                  </Button>
                )}
                <span className="text-ink-2 text-caption ml-auto shrink-0 tabular-nums">
                  {on}/{ids.length}
                </span>
                <Checkbox
                  checked={on === ids.length ? true : on === 0 ? false : "indeterminate"}
                  aria-label={`All ${group.label}`}
                  onCheckedChange={(value) => setCommandsEnabled(ids, value === true)}
                />
              </label>
              <div className="grid grid-cols-3 gap-x-4 gap-y-0.5">
                {group.commands.map((command) => (
                  <label
                    key={command.id}
                    title={command.setup ? `${command.label} — ${command.setup.reason}` : undefined}
                    className="
                      hover:bg-foreground/5
                      flex min-w-0 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1
                    "
                  >
                    <span
                      className={cn(
                        "text-ink-2 min-w-0 flex-1 truncate text-caption",
                        command.setup && "opacity-55",
                      )}
                    >
                      {command.label}
                    </span>
                    <Checkbox
                      checked={disabled[command.id] !== true}
                      aria-label={command.label}
                      onCheckedChange={(value) => setCommandsEnabled([command.id], value === true)}
                    />
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </SettingsSection>
    </SettingsTabBody>
  );
}
