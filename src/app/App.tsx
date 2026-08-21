import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Wallpaper } from "@/app/Wallpaper";
import { Header } from "@/app/Header";
import { WidgetDragOverlay } from "@/app/WidgetDragOverlay";
import { UndoBar } from "@/app/UndoBar";
import { SettingsDialog } from "@/settings";
import { Tour, Welcome } from "@/onboarding";
import { WidgetGrid } from "@/widgets/WidgetGrid";
import { useGlobalShortcuts } from "@/app/useGlobalShortcuts";
import { useDisableContextMenu } from "@/app/useDisableContextMenu";
import { useActiveWallpaper } from "@/app/useActiveWallpaper";
import { FrostImageProvider } from "@/lib/frost-image";
import { useWallpaperStore } from "@/stores/useWallpaperStore";
import { takePendingPermissionHighlight } from "@/lib/permissions";
import { useSettingsStore } from "@/settings";
import { sweepStaleResourceCaches } from "@/widgets/core/resourceCacheSweep";

export function App() {
  useGlobalShortcuts();
  useDisableContextMenu();
  const wallpaperSource = useWallpaperStore((s) => s.source);
  const isPattern = wallpaperSource === "generated";
  const { imageUrl, frostUrl } = useActiveWallpaper(!isPattern);

  useEffect(() => {
    sweepStaleResourceCaches(Date.now());
    const pending = takePendingPermissionHighlight();
    if (pending) useSettingsStore.getState().openPermissions(pending);
  }, []);

  return (
    <TooltipProvider>
      <FrostImageProvider value={frostUrl}>
        <div className="relative h-dvh overflow-hidden">
          <Wallpaper imageUrl={imageUrl} />
          <div className="mx-auto flex h-dvh w-[var(--content-width)] flex-col gap-4 py-4">
            <Header />
            <main
              data-tour="grid"
              className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]"
            >
              <WidgetGrid />
            </main>
          </div>
        </div>
      </FrostImageProvider>
      <WidgetDragOverlay />
      <UndoBar />
      <SettingsDialog />
      <Welcome />
      <Tour />
    </TooltipProvider>
  );
}
