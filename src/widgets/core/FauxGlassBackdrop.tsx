import { useShallow } from "zustand/react/shallow";
import { useFrostImage } from "@/lib/frost-image";
import {
  useWallpaperStore,
  WALLPAPER_BLEED_PER_BLUR_PX,
  type WallpaperFit,
} from "@/stores/useWallpaperStore";

const FIT_SIZE: Record<WallpaperFit, string> = {
  cover: "cover",
  contain: "contain",
  fill: "100% 100%",
  "scale-down": "contain",
};

export function FauxGlassBackdrop() {
  const frostUrl = useFrostImage();
  const { fit, dim, blur } = useWallpaperStore(
    useShallow((s) => ({ fit: s.fit, dim: s.dim, blur: s.blur })),
  );

  if (!frostUrl) return null;

  const bleed = blur * WALLPAPER_BLEED_PER_BLUR_PX;

  return (
    <div aria-hidden className="frost-layer pointer-events-none absolute inset-0 z-0">
      <div
        className="absolute bg-fixed bg-center bg-no-repeat"
        style={{
          top: -bleed,
          left: -bleed,
          width: `calc(100% + ${bleed * 2}px)`,
          height: `calc(100% + ${bleed * 2}px)`,
          backgroundImage: `url("${frostUrl}")`,
          backgroundSize: FIT_SIZE[fit],
          ...(blur > 0 ? { filter: `blur(${blur}px)` } : {}),
        }}
      />
      {dim > 0 && <div className="absolute inset-0 bg-black" style={{ opacity: dim }} />}
    </div>
  );
}
