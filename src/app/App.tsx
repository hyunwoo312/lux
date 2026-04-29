import { Wallpaper } from "@/app/Wallpaper";
import { Header } from "@/app/Header";

export function App() {
  return (
    <div className="relative min-h-dvh">
      <Wallpaper />
      <div className="
        mx-auto flex min-h-dvh w-full max-w-[var(--content-max)] flex-col gap-12 px-6 py-8
        sm:px-10
      ">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground/50 text-sm">Your widgets will appear here.</p>
        </main>
      </div>
    </div>
  );
}
