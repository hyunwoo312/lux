import { useCallback, useMemo } from "react";
import { useMediaRotation } from "@/hooks/useMediaRotation";
import { mediaList } from "@/lib/media-rotation";
import { imageNewtabQueueKey } from "@/widgets/image/media";
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

  const displayItems = useMemo(() => mediaList({ mode, single, items }), [mode, single, items]);
  const assetIds = useMemo(() => displayItems.map((item) => item.assetId), [displayItems]);

  const setIndex = useCallback(
    (index: number) => setCurrentIndex(instanceId, index),
    [setCurrentIndex, instanceId],
  );
  const advance = useCallback(() => advanceImage(instanceId), [advanceImage, instanceId]);

  const boundedIndex = useMediaRotation({
    assetIds,
    queueKey: imageNewtabQueueKey(instanceId),
    order,
    rotateOnNewtab: mode === "multi" && rotateOnNewtab,
    rotateTimed: mode === "multi" && rotateTimed,
    intervalSeconds,
    currentIndex,
    setCurrentIndex: setIndex,
    advance,
  });

  const activeItem = displayItems[boundedIndex] ?? null;
  const { thumbUrl, fullUrl, loadError } = useImageSource(activeItem?.assetId ?? null);

  return { activeItem, thumbUrl, imageUrl: fullUrl, loadError };
}
