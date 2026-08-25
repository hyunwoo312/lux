import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { exportSettings, importSettings } from "@/lib/backup";
import { ResetControl } from "@/settings/components/ResetControl";
import { SettingsRow } from "@/settings/components/SettingsRow";
import { SettingsSection } from "@/settings/components/SettingsSection";
import { StorageSection } from "@/settings/components/StorageSection";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { useShortcutsStore } from "@/stores/useShortcutsStore";
import { useAccentStore } from "@/stores/useAccentStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { useOnboardingStore } from "@/onboarding";
import { clearWallpaperAssets, useWallpaperStore } from "@/stores/useWallpaperStore";

function resetAllSettings() {
  useShortcutsStore.getState().resetAll();
  useAppSettingsStore.getState().reset();
  useThemeStore.getState().setMode("dark");
  useAccentStore.getState().reset();
  void clearWallpaperAssets();
  useWallpaperStore.getState().reset();
  useOnboardingStore.getState().replayOnNextOpen();
}

export function StorageTab() {
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
      <StorageSection />

      <SettingsSection title="Backup & restore">
        <SettingsRow
          title="Your whole setup, in one file"
          description="Widgets, layout, preferences and shortcuts. Accounts are not included."
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

      <SettingsSection title="Start over">
        <SettingsRow
          title="Reset all settings"
          description="Clears theme, shortcuts and background images, and shows the welcome again. Widgets, their content and your accounts are kept."
          control={
            <ResetControl
              onReset={resetAllSettings}
              label="Reset"
              confirmMessage="Reset all settings? Clears theme, shortcuts, and background images, and shows the welcome again. Widgets, content, and accounts are kept."
              doneMessage="Settings reset"
            />
          }
        />
      </SettingsSection>
    </div>
  );
}
