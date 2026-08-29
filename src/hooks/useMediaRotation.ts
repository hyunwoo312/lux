import { useEffect, useMemo, useRef } from "react";
import {
  getSignature,
  normalizeIndex,
  readNewtabQueue,
  selectNewtabIndex,
  writeNewtabQueue,
  type RotationOrder,
} from "@/lib/media-rotation";

type MediaRotation = {
  assetIds: string[];
  queueKey: string;
  order: RotationOrder;
  rotateOnNewtab: boolean;
  rotateTimed: boolean;
  intervalSeconds: number;
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  advance: () => void;
};

export function useMediaRotation({
  assetIds,
  queueKey,
  order,
  rotateOnNewtab,
  rotateTimed,
  intervalSeconds,
  currentIndex,
  setCurrentIndex,
  advance,
}: MediaRotation): number {
  const length = assetIds.length;
  const signature = useMemo(() => getSignature(assetIds), [assetIds]);
  const lastSignature = useRef<string | null>(null);

  useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    if (!rotateOnNewtab || length === 0) return;
    const selection = selectNewtabIndex(assetIds, readNewtabQueue(queueKey), order);
    writeNewtabQueue(queueKey, selection.next);
    setCurrentIndex(selection.index);
  }, [signature, rotateOnNewtab, length, assetIds, queueKey, order, setCurrentIndex]);

  useEffect(() => {
    if (!rotateTimed || length < 2) return;
    const id = window.setInterval(() => advance(), intervalSeconds * 1000);
    return () => window.clearInterval(id);
  }, [rotateTimed, length, intervalSeconds, advance]);

  return normalizeIndex(currentIndex, length);
}
