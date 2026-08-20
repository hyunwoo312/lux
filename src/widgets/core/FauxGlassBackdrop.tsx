import { useFrostImage } from "@/lib/frost-image";
import { useWallpaperStore, type WallpaperFit } from "@/stores/useWallpaperStore";

const FIT_SIZE: Record<WallpaperFit, string> = {
  cover: "cover",
  contain: "contain",
  fill: "100% 100%",
  "scale-down": "contain",
};

export function FauxGlassBackdrop() {
  const frostUrl = useFrostImage();
  const fit = useWallpaperStore((s) => s.fit);
  const dim = useWallpaperStore((s) => s.dim);
  const blur = useWallpaperStore((s) => s.blur);

  if (!frostUrl) return null;

  return (
    <div aria-hidden className="frost-layer pointer-events-none absolute inset-0 z-0">
      <div
        className="absolute inset-0 bg-fixed bg-center bg-no-repeat"
        style={{
          backgroundImage: `url("${frostUrl}")`,
          backgroundSize: FIT_SIZE[fit],
          filter: blur > 0 ? `blur(${blur}px)` : undefined,
          transform: blur > 0 ? "scale(1.06)" : undefined,
        }}
      />
      {dim > 0 && <div className="absolute inset-0 bg-black" style={{ opacity: dim }} />}
    </div>
  );
}
