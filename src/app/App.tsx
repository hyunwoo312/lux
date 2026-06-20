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
      <div className="relative min-h-dvh">
        <Wallpaper />
        <div className="mx-auto flex min-h-dvh w-[var(--content-width)] flex-col gap-4 py-4">
          <Header />
          <main data-tour="grid">
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
