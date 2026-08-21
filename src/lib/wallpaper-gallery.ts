export type GalleryWallpaper = {
  id: string;
  name: string;
  url: string;
  thumb: string;
};

const NAMES = {
  wp1: "Coast",
  wp2: "Summit",
  wp3: "Milky Way",
  wp4: "Skyline",
  wp5: "Meadow",
} as const;

export const GALLERY_WALLPAPERS: GalleryWallpaper[] = Object.entries(NAMES).map(([id, name]) => ({
  id,
  name,
  url: `/wallpapers/${id}.webp`,
  thumb: `/wallpapers/${id}-thumb.webp`,
}));

export const GALLERY_ASSET_PREFIX = "gallery-";

export function galleryAssetId(galleryId: string): string {
  return `${GALLERY_ASSET_PREFIX}${galleryId}`;
}

export function findGalleryWallpaper(id: string | null): GalleryWallpaper | null {
  if (!id) return null;
  return GALLERY_WALLPAPERS.find((wallpaper) => wallpaper.id === id) ?? null;
}
