import { useEffect, useMemo, useRef, useState } from "react";
import { readImageAsset } from "@/widgets/image/media";
import {
  getSignature,
  readNewtabQueue,
  selectNewtabIndex,
  writeNewtabQueue,
} from "@/lib/media-rotation";
import type { ImageItem } from "@/widgets/image/types";
import { useImage, useImageIndex, useImageStore } from "@/widgets/image/useImageStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const IMAGE_NEWTAB_QUEUE_KEY = "lux.image.newtab-queue";

type ActiveImage = {
  activeItem: ImageItem | null;
  imageUrl: string | null;
  loadError: string | null;
};

export function useActiveImage(): ActiveImage {
  const instanceId = useWidgetInstanceId();
  const mode = useImage((c) => c.mode);
  const single = useImage((c) => c.single);
  const items = useImage((c) => c.items);
  const rotateOnNewtab = useImage((c) => c.rotateOnNewtab);
  const rotateTimed = useImage((c) => c.rotateTimed);
  const intervalSeconds = useImage((c) => c.intervalSeconds);
  const currentIndex = useImageIndex();
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

  const queueKey = `${IMAGE_NEWTAB_QUEUE_KEY}.${instanceId}`;
  const lastSignature = useRef<string | null>(null);
  useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    if (newtabEnabled && length > 0) {
      const selection = selectNewtabIndex(
        displayItems.map((item) => item.assetId),
        readNewtabQueue(queueKey),
      );
      writeNewtabQueue(queueKey, selection.next);
      setCurrentIndex(instanceId, selection.index);
    }
  }, [signature, newtabEnabled, length, displayItems, setCurrentIndex, instanceId, queueKey]);

  useEffect(() => {
    if (!timedEnabled || length < 2) return;
    const id = window.setInterval(() => advanceImage(instanceId), intervalSeconds * 1000);
    return () => window.clearInterval(id);
  }, [timedEnabled, length, intervalSeconds, advanceImage, instanceId]);

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
