import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Wallpaper } from "@/app/Wallpaper";
import { Header } from "@/app/Header";
import { WidgetDragOverlay } from "@/app/WidgetDragOverlay";
import { SettingsDialog } from "@/settings";
import { Tour, Welcome } from "@/onboarding";
import { WidgetGrid } from "@/widgets/WidgetGrid";
import { useGlobalShortcuts } from "@/app/useGlobalShortcuts";
import { useDisableContextMenu } from "@/app/useDisableContextMenu";
import { useActiveWallpaper } from "@/app/useActiveWallpaper";
import { useBlurredWallpaper } from "@/app/useBlurredWallpaper";
import { useWallpaperStore } from "@/stores/useWallpaperStore";
import { FrostImageProvider } from "@/lib/frost-image";
import { sweepStaleResourceCaches } from "@/widgets/core/resourceCacheSweep";

export function App() {
  useGlobalShortcuts();
  useDisableContextMenu();
  const wallpaperEnabled = useWallpaperStore((s) => s.enabled);
  const { imageUrl } = useActiveWallpaper(wallpaperEnabled);
  const frostUrl = useBlurredWallpaper(imageUrl);

  useEffect(() => {
    sweepStaleResourceCaches(Date.now());
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
        <WidgetDragOverlay />
        <SettingsDialog />
        <Welcome />
        <Tour />
      </FrostImageProvider>
    </TooltipProvider>
  );
}
