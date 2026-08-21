import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConfigSegmented } from "@/components/config/WidgetConfig";
import { AccentPicker } from "@/settings/components/AccentPicker";
import { exportSettings, importSettings } from "@/lib/backup";
import { WallpaperSetting } from "@/settings/components/WallpaperSetting";
import { ResetControl } from "@/settings/components/ResetControl";
import { SettingsRow } from "@/settings/components/SettingsRow";
import { SettingsSection } from "@/settings/components/SettingsSection";
import { StorageSection } from "@/settings/components/StorageSection";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { useShortcutsStore } from "@/stores/useShortcutsStore";
import { useAccentStore } from "@/stores/useAccentStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { clearWallpaperAssets, useWallpaperStore } from "@/stores/useWallpaperStore";
import type { ThemeMode } from "@/lib/theme";

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const satisfies { value: ThemeMode; label: string }[];

function resetAllSettings() {
  useShortcutsStore.getState().resetAll();
  useAppSettingsStore.getState().reset();
  useThemeStore.getState().setMode("dark");
  useAccentStore.getState().reset();
  void clearWallpaperAssets();
  useWallpaperStore.getState().reset();
}

export function GeneralTab() {
  const clock24h = useAppSettingsStore((s) => s.clock24h);
  const setClock24h = useAppSettingsStore((s) => s.setClock24h);
  const showGridLines = useAppSettingsStore((s) => s.showGridLines);
  const setShowGridLines = useAppSettingsStore((s) => s.setShowGridLines);
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const isThemePersisted = useThemeStore((s) => s.isPersisted);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | undefined>(undefined);
  const [pendingImport, setPendingImport] = useState<File | null>(null);

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportError(undefined);
    setPendingImport(file);
  }

  async function confirmImport() {
    if (!pendingImport) return;
    try {
      await importSettings(pendingImport);
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Couldn’t import that file — it may not be a valid Lux backup.",
      );
      setPendingImport(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title="Appearance">
        <SettingsRow
          title="Theme"
          description="Follow your system setting, or pick light or dark."
          control={
            <ConfigSegmented
              label="Theme"
              value={themeMode}
              options={THEME_OPTIONS}
              onChange={setThemeMode}
            />
          }
        >
          {!isThemePersisted && (
            <p className="text-destructive text-caption">
              Browser storage is full, so this theme won’t be remembered in new tabs.
            </p>
          )}
        </SettingsRow>
        <SettingsRow
          title="Accent"
          description="The highlight colour used across Lux."
          control={<AccentPicker />}
        />
        <SettingsRow
          title="Grid lines"
          description="Always show the dashboard grid, not only while editing."
          control={<Switch checked={showGridLines} onCheckedChange={setShowGridLines} />}
        />
      </SettingsSection>

      <SettingsSection title="Wallpaper">
        <WallpaperSetting />
      </SettingsSection>

      <SettingsSection title="Time">
        <SettingsRow
          title="24-hour time"
          description="Use a 24-hour clock instead of AM/PM."
          control={<Switch checked={clock24h} onCheckedChange={setClock24h} />}
        />
      </SettingsSection>

      <StorageSection />

      <SettingsSection title="Backup">
        <SettingsRow
          title="Backup & restore"
          control={
            pendingImport ? (
              <div className="flex items-center gap-2">
                <Button variant="destructive" onClick={() => void confirmImport()}>
                  Replace
                </Button>
                <Button variant="ghost" onClick={() => setPendingImport(null)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => void exportSettings()}>
                  Export
                </Button>
                <Button variant="outline" onClick={() => fileRef.current?.click()}>
                  Import
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleFileSelected}
                />
              </div>
            )
          }
        >
          {pendingImport && (
            <p className="text-ink-3 text-caption">
              Replace all settings with “{pendingImport.name}”? This reloads the page.
            </p>
          )}
          {importError && <p className="text-destructive text-caption">{importError}</p>}
        </SettingsRow>
      </SettingsSection>

      <ResetControl
        onReset={resetAllSettings}
        label="Reset all settings"
        confirmMessage="Reset all settings? Clears theme, shortcuts, and background images. Widgets, content, and accounts are kept."
        doneMessage="Settings reset"
      />
    </div>
  );
}
