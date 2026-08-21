import { cn } from "@/lib/utils";
import { AuroraWallpaper } from "@/app/wallpaper/AuroraWallpaper";
import { BloomWallpaper } from "@/app/wallpaper/BloomWallpaper";
import { GradientWallpaper } from "@/app/wallpaper/GradientWallpaper";
import { MeshWallpaper } from "@/app/wallpaper/MeshWallpaper";
import { usePageVisible } from "@/app/wallpaper/usePageVisible";
import { useWallpaperStore } from "@/stores/useWallpaperStore";

export function GeneratedWallpaper() {
  const style = useWallpaperStore((s) => s.generatedStyle);
  const motion = useWallpaperStore((s) => s.generatedMotion);
  const intensity = useWallpaperStore((s) => s.generatedIntensity);
  const density = useWallpaperStore((s) => s.generatedDensity);
  const speed = useWallpaperStore((s) => s.generatedSpeed);
  const visible = usePageVisible();

  const paused = !motion || !visible || style === "still";

  return (
    <div aria-hidden className={cn("absolute inset-0 overflow-hidden", paused && "wp-paused")}>
      {style === "mesh" && <MeshWallpaper intensity={intensity} density={density} />}
      {style === "aurora" && <AuroraWallpaper intensity={intensity} speed={speed} />}
      {style === "bloom" && <BloomWallpaper intensity={intensity} speed={speed} />}
      {style === "still" && <GradientWallpaper style={style} intensity={intensity} />}
    </div>
  );
}
