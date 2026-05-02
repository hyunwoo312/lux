import { Wallpaper } from "@/app/Wallpaper";
import { Header } from "@/app/Header";
import { WidgetGrid } from "@/widgets/WidgetGrid";

export function App() {
  return (
    <div className="relative min-h-dvh">
      <Wallpaper />
      <div className="mx-auto flex min-h-dvh w-[var(--content-width)] flex-col gap-12 py-8">
        <Header />
        <main>
          <WidgetGrid />
        </main>
      </div>
    </div>
  );
}
