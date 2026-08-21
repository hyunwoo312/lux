import type { MediaImageItem } from "@/lib/asset-store";
import { findGalleryWallpaper } from "@/lib/wallpaper-gallery";
import { wallpaperAssets } from "@/stores/useWallpaperStore";

const PREFIX = "gallery-";

export function galleryAssetId(galleryId: string): string {
  return `${PREFIX}${galleryId}`;
}

export function isGalleryAssetId(assetId: string): boolean {
  return assetId.startsWith(PREFIX);
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

export async function ensureGalleryAsset(galleryId: string): Promise<boolean> {
  const wallpaper = findGalleryWallpaper(galleryId);
  if (!wallpaper) return false;
  const id = galleryAssetId(galleryId);
  const existing = await wallpaperAssets.read(id).catch(() => null);
  if (existing) return true;
  try {
    const response = await fetch(wallpaper.url);
    if (!response.ok) return false;
    const blob = await response.blob();
    await wallpaperAssets.save({
      id,
      fileName: wallpaper.name,
      mimeType: blob.type || "image/webp",
      size: blob.size,
      blob,
    });
    return true;
  } catch {
    return false;
  }
}
