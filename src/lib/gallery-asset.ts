import type { MediaImageItem, StoredAsset } from "@/lib/asset-store";
import { withTimeout } from "@/lib/net";
import { findGalleryWallpaper } from "@/lib/wallpaper-gallery";
import { wallpaperAssets } from "@/stores/useWallpaperStore";

const PREFIX = "gallery-";

export function galleryAssetId(galleryId: string): string {
  return `${PREFIX}${galleryId}`;
}

export function galleryItemFor(galleryId: string): MediaImageItem | null {
  const wallpaper = findGalleryWallpaper(galleryId);
  if (!wallpaper) return null;
  return {
    assetId: galleryAssetId(galleryId),
    fileName: wallpaper.name,
    mimeType: "image/webp",
    size: 0,
  };
}

export async function ensureGalleryAsset(galleryId: string): Promise<StoredAsset | null> {
  const wallpaper = findGalleryWallpaper(galleryId);
  if (!wallpaper) return null;
  const id = galleryAssetId(galleryId);
  const existing = await wallpaperAssets.read(id).catch(() => null);
  if (existing) return existing;
  try {
    const response = await fetch(wallpaper.url, { signal: withTimeout() });
    if (!response.ok) return null;
    const blob = await response.blob();
    const asset = {
      id,
      fileName: wallpaper.name,
      mimeType: blob.type || "image/webp",
      size: blob.size,
      blob,
    };
    await wallpaperAssets.save(asset);
    return asset;
  } catch {
    return null;
  }
}
