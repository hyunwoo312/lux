import { TooltipProvider } from "@/components/ui/tooltip";
import { Wallpaper } from "@/app/Wallpaper";
import { Header } from "@/app/Header";
import { WidgetDragOverlay } from "@/app/WidgetDragOverlay";
import { WidgetGrid } from "@/widgets/WidgetGrid";

export function App() {
  return (
    <TooltipProvider>
      <div className="relative min-h-dvh">
        <Wallpaper />
        <div className="mx-auto flex min-h-dvh w-[var(--content-width)] flex-col gap-12 py-8">
          <Header />
          <main>
            <WidgetGrid />
          </main>
        </div>
      </div>
      <WidgetDragOverlay />
    </TooltipProvider>
  );
}
