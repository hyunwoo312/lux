import { useEffect, useMemo, useRef } from "react";
import { imageNewtabQueueKey } from "@/widgets/image/media";
import {
  getSignature,
  readNewtabQueue,
  selectNewtabIndex,
  writeNewtabQueue,
} from "@/lib/media-rotation";
import { useImageSource } from "@/widgets/image/hooks/useImageSource";
import type { ImageItem } from "@/widgets/image/types";
import { useImage, useImageIndex, useImageStore } from "@/widgets/image/useImageStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

type ActiveImage = {
  activeItem: ImageItem | null;
  thumbUrl: string | null;
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
  const order = useImage((c) => c.order);
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

  const queueKey = imageNewtabQueueKey(instanceId);
  const lastSignature = useRef<string | null>(null);
  useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    if (newtabEnabled && length > 0) {
      const selection = selectNewtabIndex(
        displayItems.map((item) => item.assetId),
        readNewtabQueue(queueKey),
        order,
      );
      writeNewtabQueue(queueKey, selection.next);
      setCurrentIndex(instanceId, selection.index);
    }
  }, [
    signature,
    newtabEnabled,
    length,
    displayItems,
    setCurrentIndex,
    instanceId,
    queueKey,
    order,
  ]);

  useEffect(() => {
    if (!timedEnabled || length < 2) return;
    const id = window.setInterval(() => advanceImage(instanceId), intervalSeconds * 1000);
    return () => window.clearInterval(id);
  }, [timedEnabled, length, intervalSeconds, advanceImage, instanceId]);

  const boundedIndex = length > 0 ? ((currentIndex % length) + length) % length : 0;
  const activeItem = displayItems[boundedIndex] ?? null;
  const { thumbUrl, fullUrl, loadError } = useImageSource(activeItem?.assetId ?? null);

  return { activeItem, thumbUrl, imageUrl: fullUrl, loadError };
}
