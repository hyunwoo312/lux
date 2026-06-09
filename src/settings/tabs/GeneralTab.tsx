import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { exportSettings, importSettings } from "@/lib/backup";
import { BackgroundSetting } from "@/settings/components/BackgroundSetting";
import { ResetControl } from "@/settings/components/ResetControl";
import { SettingsRow } from "@/settings/components/SettingsRow";
import { SettingsSection } from "@/settings/components/SettingsSection";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { useShortcutsStore } from "@/stores/useShortcutsStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { clearWallpaperAssets, useWallpaperStore } from "@/stores/useWallpaperStore";

function resetAllSettings() {
  useShortcutsStore.getState().resetAll();
  useAppSettingsStore.getState().reset();
  useThemeStore.getState().setTheme("dark");
  void clearWallpaperAssets();
  useWallpaperStore.getState().reset();
}

export function GeneralTab() {
  const clock24h = useAppSettingsStore((s) => s.clock24h);
  const setClock24h = useAppSettingsStore((s) => s.setClock24h);
  const showGridLines = useAppSettingsStore((s) => s.showGridLines);
  const setShowGridLines = useAppSettingsStore((s) => s.setShowGridLines);
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
      setImportError(error instanceof Error ? error.message : "Could not import settings.");
      setPendingImport(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title="Appearance" description="Theme and grid for the dashboard.">
        <SettingsRow
          title="Theme"
          description="Switch between the light and dark glass themes."
          control={<ThemeToggle />}
        />
        <SettingsRow
          title="Grid lines"
          description="Always show the dashboard grid, not only while editing."
          control={<Switch checked={showGridLines} onCheckedChange={setShowGridLines} />}
        />
      </SettingsSection>

      <SettingsSection title="Background" description="A custom image behind the dashboard.">
        <BackgroundSetting />
      </SettingsSection>

      <SettingsSection title="Time" description="How time is shown across widgets.">
        <SettingsRow
          title="24-hour time"
          description="Use a 24-hour clock instead of AM/PM."
          control={<Switch checked={clock24h} onCheckedChange={setClock24h} />}
        />
      </SettingsSection>

      <SettingsSection
        title="Backup"
        description="Save or load all settings as a file. Connected accounts are excluded."
      >
        <SettingsRow
          title="Backup & restore"
          control={
            pendingImport ? (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="destructive" onClick={() => void confirmImport()}>
                  Replace
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPendingImport(null)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => void exportSettings()}>
                  Export
                </Button>
                <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
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
            <p className="text-muted-foreground text-xs">
              Replace all settings with “{pendingImport.name}”? This reloads the page.
            </p>
          )}
          {importError && <p className="text-destructive text-xs">{importError}</p>}
        </SettingsRow>
      </SettingsSection>

      <ResetControl
        onReset={resetAllSettings}
        label="Reset all settings"
        confirmMessage="Reset all settings? Keeps widgets, content, and accounts."
        doneMessage="Settings reset"
      />
    </div>
  );
}
