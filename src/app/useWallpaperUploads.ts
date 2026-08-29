import { saveMediaAsset, validateImageFile, type MediaImageItem } from "@/lib/asset-store";
import { useMediaUploads } from "@/hooks/useMediaUploads";
import {
  MAX_WALLPAPER_IMAGES,
  WALLPAPER_ENCODE_QUALITY,
  WALLPAPER_MAX_BYTES,
  useWallpaperStore,
  wallpaperAssets,
} from "@/stores/useWallpaperStore";

export function useWallpaperUploads() {
  const mode = useWallpaperStore((s) => s.mode);
  const single = useWallpaperStore((s) => s.single);
  const items = useWallpaperStore((s) => s.items);
  const setSingle = useWallpaperStore((s) => s.setSingle);
  const setItems = useWallpaperStore((s) => s.setItems);

  return useMediaUploads<MediaImageItem>({
    mode,
    single,
    items,
    maxItems: MAX_WALLPAPER_IMAGES,
    poolLabel: "Background pool",
    validate: (file) => validateImageFile(file, WALLPAPER_MAX_BYTES),
    save: (file) =>
      saveMediaAsset(wallpaperAssets, file, {
        prefix: "wallpaper",
        fallbackName: "Wallpaper",
        quality: WALLPAPER_ENCODE_QUALITY,
      }),
    remove: (assetId) => wallpaperAssets.remove(assetId),
    setSingle,
    setItems,
  });
}
