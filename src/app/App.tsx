import { TooltipProvider } from "@/components/ui/tooltip";
import { Wallpaper } from "@/app/Wallpaper";
import { Header } from "@/app/Header";
import { WidgetDragOverlay } from "@/app/WidgetDragOverlay";
import { SettingsDialog } from "@/settings";
import { Tour, Welcome } from "@/onboarding";
import { WidgetGrid } from "@/widgets/WidgetGrid";
import { useGlobalShortcuts } from "@/app/useGlobalShortcuts";
import { useDisableContextMenu } from "@/app/useDisableContextMenu";

export function App() {
  useGlobalShortcuts();
  useDisableContextMenu();

  return (
    <TooltipProvider>
      <div className="relative h-dvh overflow-hidden">
        <Wallpaper />
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
    </TooltipProvider>
  );
}
