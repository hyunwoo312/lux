import { useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useBoardWidth } from "@/app/useBoardWidth";
import { Wallpaper } from "@/app/Wallpaper";
import { Header } from "@/app/Header";
import { WidgetDragOverlay } from "@/app/WidgetDragOverlay";
import { Toaster } from "@/components/Toaster";
import { SettingsDialog } from "@/settings";
import { Welcome } from "@/onboarding";
import { WidgetGrid } from "@/widgets/WidgetGrid";
import { useGlobalShortcuts } from "@/app/useGlobalShortcuts";
import { useDisableContextMenu } from "@/app/useDisableContextMenu";
import { useActiveWallpaper } from "@/app/useActiveWallpaper";
import { enterTween } from "@/lib/motion";
import { FrostImageProvider } from "@/lib/frost-image";
import { useWallpaperStore } from "@/stores/useWallpaperStore";
import { takePendingPermissionHighlight } from "@/lib/permissions";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { useSettingsStore } from "@/settings";
import { sweepStaleResourceCaches } from "@/widgets/core/resourceCacheSweep";
import { usePersistHydrated } from "@/hooks/usePersistHydrated";

export function App() {
  useGlobalShortcuts();
  useDisableContextMenu();
  const wallpaperSource = useWallpaperStore((s) => s.source);
  const isPattern = wallpaperSource === "generated";
  const { imageUrl, frostUrl } = useActiveWallpaper(!isPattern);
  const boardReady = usePersistHydrated(useDashboardStore);
  const reduced = useReducedMotion();

  useEffect(() => {
    sweepStaleResourceCaches(Date.now());
    const pending = takePendingPermissionHighlight();
    if (pending) useSettingsStore.getState().openPermissions(pending);
  }, []);

  const boardWidth = useBoardWidth();

  return (
    <TooltipProvider>
      <FrostImageProvider value={frostUrl}>
        <div className="relative h-dvh overflow-hidden">
          <Wallpaper imageUrl={imageUrl} />
          <motion.div
            style={{ width: boardWidth }}
            initial={{ opacity: 0 }}
            animate={{ opacity: boardReady ? 1 : 0 }}
            transition={enterTween(reduced, "fast")}
            className="mx-auto flex h-full flex-col gap-4 py-4"
          >
            <Header />
            <main className="scrollbar-gutter min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
              <WidgetGrid />
            </main>
          </motion.div>
        </div>
      </FrostImageProvider>
      <WidgetDragOverlay />
      <Toaster />
      <SettingsDialog />
      <Welcome />
    </TooltipProvider>
  );
}
