import { useEffect, useMemo, useRef, useState } from "react";
import { readImageAsset } from "@/widgets/image/media";
import {
  getSignature,
  readNewtabQueue,
  selectNewtabIndex,
  writeNewtabQueue,
} from "@/lib/media-rotation";
import type { ImageItem } from "@/widgets/image/types";
import { useImageStore } from "@/widgets/image/useImageStore";

const IMAGE_NEWTAB_QUEUE_KEY = "lux.image.newtab-queue";

type ActiveImage = {
  activeItem: ImageItem | null;
  imageUrl: string | null;
  loadError: string | null;
};

export function useActiveImage(): ActiveImage {
  const mode = useImageStore((s) => s.mode);
  const single = useImageStore((s) => s.single);
  const items = useImageStore((s) => s.items);
  const rotateOnNewtab = useImageStore((s) => s.rotateOnNewtab);
  const rotateTimed = useImageStore((s) => s.rotateTimed);
  const intervalSeconds = useImageStore((s) => s.intervalSeconds);
  const currentIndex = useImageStore((s) => s.currentIndex);
  const setCurrentIndex = useImageStore((s) => s.setCurrentIndex);
  const advanceImage = useImageStore((s) => s.advanceImage);

  const displayItems = useMemo(
    () => (mode === "multi" ? items : single ? [single] : []),
    [mode, items, single],
  );
  const length = displayItems.length;
  const signature = useMemo(
    () => getSignature(displayItems.map((item) => item.assetId)),
    [displayItems],
  );
  const newtabEnabled = mode === "multi" && rotateOnNewtab;
  const timedEnabled = mode === "multi" && rotateTimed;

  const lastSignature = useRef<string | null>(null);
  useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    if (newtabEnabled && length > 0) {
      const selection = selectNewtabIndex(
        displayItems.map((item) => item.assetId),
        readNewtabQueue(IMAGE_NEWTAB_QUEUE_KEY),
      );
      writeNewtabQueue(IMAGE_NEWTAB_QUEUE_KEY, selection.next);
      setCurrentIndex(selection.index);
    }
  }, [signature, newtabEnabled, length, displayItems, setCurrentIndex]);

  useEffect(() => {
    if (!timedEnabled || length < 2) return;
    const id = window.setInterval(() => advanceImage(), intervalSeconds * 1000);
    return () => window.clearInterval(id);
  }, [timedEnabled, length, intervalSeconds, advanceImage]);

  const boundedIndex = length > 0 ? ((currentIndex % length) + length) % length : 0;
  const activeItem = displayItems[boundedIndex] ?? null;
  const activeAssetId = activeItem?.assetId ?? null;

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadError(null);
    if (!activeAssetId) {
      setImageUrl(null);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      return;
    }
    void (async () => {
      try {
        const asset = await readImageAsset(activeAssetId);
        if (!active) return;
        if (!asset) {
          setLoadError("Image file is no longer available. Replace it to continue.");
          setImageUrl(null);
          return;
        }
        const nextUrl = URL.createObjectURL(asset.blob);
        const previousUrl = objectUrlRef.current;
        objectUrlRef.current = nextUrl;
        setImageUrl(nextUrl);
        if (previousUrl) window.setTimeout(() => URL.revokeObjectURL(previousUrl), 600);
      } catch (error) {
        if (active) {
          setLoadError(error instanceof Error ? error.message : "Image could not be loaded.");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [activeAssetId]);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  return { activeItem, imageUrl, loadError };
}
