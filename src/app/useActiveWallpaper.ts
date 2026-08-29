import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { useMediaRotation } from "@/hooks/useMediaRotation";
import type { MediaImageItem } from "@/lib/asset-store";
import { resolveFrost } from "@/lib/frost";
import { DURATION } from "@/lib/motion";
import { ensureGalleryAsset, galleryItemFor } from "@/lib/gallery-asset";
import { mediaList } from "@/lib/media-rotation";
import { activeWallpaperIds, useWallpaperStore, wallpaperAssets } from "@/stores/useWallpaperStore";

const WALLPAPER_NEWTAB_QUEUE_KEY = "lux.wallpaper.newtab-queue";
const URL_RELEASE_DELAY_MS = DURATION.slow * 1000 + 100;

type ActiveWallpaper = {
  activeItem: MediaImageItem | null;
  imageUrl: string | null;
  frostUrl: string | null;
};

function swapObjectUrl(ref: RefObject<string | null>, next: string | null): void {
  const previous = ref.current;
  ref.current = next;
  if (previous) window.setTimeout(() => URL.revokeObjectURL(previous), URL_RELEASE_DELAY_MS);
}

export function useActiveWallpaper(enabled: boolean): ActiveWallpaper {
  const source = useWallpaperStore((s) => s.source);
  const mode = useWallpaperStore((s) => s.mode);
  const single = useWallpaperStore((s) => s.single);
  const items = useWallpaperStore((s) => s.items);
  const gallerySingle = useWallpaperStore((s) => s.gallerySingle);
  const galleryItems = useWallpaperStore((s) => s.galleryItems);
  const rotateOnNewtab = useWallpaperStore((s) => s.rotateOnNewtab);
  const rotateTimed = useWallpaperStore((s) => s.rotateTimed);
  const order = useWallpaperStore((s) => s.order);
  const intervalSeconds = useWallpaperStore((s) => s.intervalSeconds);
  const currentIndex = useWallpaperStore((s) => s.currentIndex);
  const setCurrentIndex = useWallpaperStore((s) => s.setCurrentIndex);
  const advance = useWallpaperStore((s) => s.advance);

  const displayItems = useMemo(() => {
    if (source !== "gallery") return mediaList({ mode, single, items });
    const ids = activeWallpaperIds({ source, mode, single, items, gallerySingle, galleryItems });
    return ids.map(galleryItemFor).filter((item) => item !== null);
  }, [source, mode, items, single, galleryItems, gallerySingle]);
  const assetIds = useMemo(() => displayItems.map((item) => item.assetId), [displayItems]);

  const boundedIndex = useMediaRotation({
    assetIds,
    queueKey: WALLPAPER_NEWTAB_QUEUE_KEY,
    order,
    rotateOnNewtab: enabled && mode === "multi" && rotateOnNewtab,
    rotateTimed: enabled && mode === "multi" && rotateTimed,
    intervalSeconds,
    currentIndex,
    setCurrentIndex,
    advance,
  });

  const activeItem = displayItems[boundedIndex] ?? null;
  const activeAssetId = activeItem?.assetId ?? null;
  const activeGalleryId =
    source === "gallery" ? (mode === "multi" ? galleryItems[boundedIndex] : gallerySingle) : null;

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [frostUrl, setFrostUrl] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const frostUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!enabled || !activeAssetId) {
      setImageUrl(null);
      setFrostUrl(null);
      swapObjectUrl(objectUrlRef, null);
      swapObjectUrl(frostUrlRef, null);
      return;
    }
    void (async () => {
      const asset = activeGalleryId
        ? await ensureGalleryAsset(activeGalleryId)
        : await wallpaperAssets.read(activeAssetId).catch(() => null);
      if (!active || !asset) return;
      const nextUrl = URL.createObjectURL(asset.blob);
      swapObjectUrl(objectUrlRef, nextUrl);
      setImageUrl(nextUrl);

      const frost = await resolveFrost(wallpaperAssets, asset);
      if (!active) return;
      const nextFrostUrl = frost ? URL.createObjectURL(frost) : null;
      swapObjectUrl(frostUrlRef, nextFrostUrl);
      setFrostUrl(nextFrostUrl);
    })();
    return () => {
      active = false;
    };
  }, [activeAssetId, activeGalleryId, enabled]);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      if (frostUrlRef.current) URL.revokeObjectURL(frostUrlRef.current);
    },
    [],
  );

  return { activeItem, imageUrl, frostUrl };
}
