import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { exportSettings, importSettings } from "@/lib/backup";
import { StorageSection } from "@/settings/components/StorageSection";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { useShortcutsStore } from "@/stores/useShortcutsStore";
import { useAccentStore } from "@/stores/useAccentStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { useOnboardingStore } from "@/onboarding";
import { useChangelogStore } from "@/changelog";
import { usePaletteStore } from "@/stores/usePaletteStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { showToast } from "@/stores/useToastStore";
import { clearWallpaperAssets, useWallpaperStore } from "@/stores/useWallpaperStore";
import { ConfigRow, ConfigSection, ConfigBody } from "@/components/config/Config";
import { BACKUP, START_OVER } from "@/settings/rows";
import { flushStorageWrites } from "@/lib/storage";
import { storageFailures } from "@/lib/storage-status";

async function resetAllSettings() {
  useShortcutsStore.getState().resetAll();
  useAppSettingsStore.getState().reset();
  useThemeStore.getState().reset();
  useAccentStore.getState().reset();
  usePaletteStore.getState().reset();
  useSettingsStore.getState().reset();
  useChangelogStore.getState().reset();
  await clearWallpaperAssets();
  useWallpaperStore.getState().reset();
  useOnboardingStore.getState().replayOnNextOpen();
  await flushStorageWrites();
  if (storageFailures().length > 0)
    throw new Error("Some settings couldn’t be saved. Retry saving before resetting again.");
  showToast({ key: "settings-reset", message: "Settings reset" });
}

export function StorageTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | undefined>(undefined);
  const [pendingImport, setPendingImport] = useState<File | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(operation: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setImportError(undefined);
    try {
      await operation();
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Couldn’t save these settings. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportError(undefined);
    setPendingImport(file);
  }

  async function confirmImport() {
    if (!pendingImport) return;
    await run(async () => {
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
    });
  }

  return (
    <ConfigBody>
      <StorageSection />

      <ConfigSection title={BACKUP.title}>
        <ConfigRow
          {...BACKUP.rows.file}
          control={
            pendingImport ? (
              <div className="flex items-center gap-2">
                <Button variant="destructive" disabled={busy} onClick={() => void confirmImport()}>
                  {busy ? "Replacing…" : "Replace"}
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => setPendingImport(null)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" disabled={busy} onClick={() => void run(exportSettings)}>
                  Export
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
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
          {importError && (
            <p role="alert" className="text-destructive text-caption">
              {importError}
            </p>
          )}
        </ConfigRow>
      </ConfigSection>

      <ConfigSection title={START_OVER.title}>
        <ConfigRow
          {...START_OVER.rows.reset}
          control={
            <Button
              variant="ghost-destructive"
              disabled={busy}
              onClick={() => setConfirmReset(true)}
            >
              Reset
            </Button>
          }
        />
      </ConfigSection>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset all settings?"
        description={START_OVER.rows.reset.description}
        confirmLabel="Reset all"
        onConfirm={() => void run(resetAllSettings)}
      />
    </ConfigBody>
  );
}
