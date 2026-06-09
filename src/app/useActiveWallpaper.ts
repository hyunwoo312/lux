import { useEffect, useMemo, useRef, useState } from "react";
import type { MediaImageItem } from "@/lib/asset-store";
import {
  getSignature,
  readNewtabQueue,
  selectNewtabIndex,
  writeNewtabQueue,
} from "@/lib/media-rotation";
import { useWallpaperStore, wallpaperAssets } from "@/stores/useWallpaperStore";

const WALLPAPER_NEWTAB_QUEUE_KEY = "lux.wallpaper.newtab-queue";

type ActiveWallpaper = {
  activeItem: MediaImageItem | null;
  imageUrl: string | null;
};

export function useActiveWallpaper(enabled: boolean): ActiveWallpaper {
  const mode = useWallpaperStore((s) => s.mode);
  const single = useWallpaperStore((s) => s.single);
  const items = useWallpaperStore((s) => s.items);
  const rotateOnNewtab = useWallpaperStore((s) => s.rotateOnNewtab);
  const rotateTimed = useWallpaperStore((s) => s.rotateTimed);
  const intervalSeconds = useWallpaperStore((s) => s.intervalSeconds);
  const currentIndex = useWallpaperStore((s) => s.currentIndex);
  const setCurrentIndex = useWallpaperStore((s) => s.setCurrentIndex);
  const advance = useWallpaperStore((s) => s.advance);

  const displayItems = useMemo(
    () => (mode === "multi" ? items : single ? [single] : []),
    [mode, items, single],
  );
  const length = displayItems.length;
  const signature = useMemo(
    () => getSignature(displayItems.map((item) => item.assetId)),
    [displayItems],
  );
  const newtabEnabled = enabled && mode === "multi" && rotateOnNewtab;
  const timedEnabled = enabled && mode === "multi" && rotateTimed;

  const lastSignature = useRef<string | null>(null);
  useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    if (newtabEnabled && length > 0) {
      const selection = selectNewtabIndex(
        displayItems.map((item) => item.assetId),
        readNewtabQueue(WALLPAPER_NEWTAB_QUEUE_KEY),
      );
      writeNewtabQueue(WALLPAPER_NEWTAB_QUEUE_KEY, selection.next);
      setCurrentIndex(selection.index);
    }
  }, [signature, newtabEnabled, length, displayItems, setCurrentIndex]);

  useEffect(() => {
    if (!timedEnabled || length < 2) return;
    const id = window.setInterval(() => advance(), intervalSeconds * 1000);
    return () => window.clearInterval(id);
  }, [timedEnabled, length, intervalSeconds, advance]);

  const boundedIndex = length > 0 ? ((currentIndex % length) + length) % length : 0;
  const activeItem = displayItems[boundedIndex] ?? null;
  const activeAssetId = activeItem?.assetId ?? null;

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!enabled || !activeAssetId) {
      setImageUrl(null);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      return;
    }
    void (async () => {
      const asset = await wallpaperAssets.read(activeAssetId).catch(() => null);
      if (!active || !asset) return;
      const nextUrl = URL.createObjectURL(asset.blob);
      const previousUrl = objectUrlRef.current;
      objectUrlRef.current = nextUrl;
      setImageUrl(nextUrl);
      if (previousUrl) window.setTimeout(() => URL.revokeObjectURL(previousUrl), 600);
    })();
    return () => {
      active = false;
    };
  }, [activeAssetId, enabled]);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  return { activeItem, imageUrl };
}
