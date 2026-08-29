import { useEffect, useState } from "react";
import { createAssetId, type MediaImageItem } from "@/lib/asset-store";
import { mediaList, normalizeIndex } from "@/lib/media-rotation";
import { useWallpaperStore, wallpaperAssets } from "@/stores/useWallpaperStore";
import { readImageAsset } from "@/widgets/image/media";
import { useImage, useImageIndex } from "@/widgets/image/useImageStore";

type SetBackgroundStatus = "idle" | "saving" | "done" | "error";

type SetImageAsBackground = {
  setAsBackground: () => Promise<void>;
  canSet: boolean;
  status: SetBackgroundStatus;
};

export function useSetImageAsBackground(): SetImageAsBackground {
  const mode = useImage((c) => c.mode);
  const single = useImage((c) => c.single);
  const items = useImage((c) => c.items);
  const index = useImageIndex();
  const [status, setStatus] = useState<SetBackgroundStatus>("idle");

  const list = mediaList({ mode, single, items });
  const activeItem = list[normalizeIndex(index, list.length)] ?? null;

  useEffect(() => {
    if (status !== "done" && status !== "error") return;
    const id = window.setTimeout(() => setStatus("idle"), 2000);
    return () => window.clearTimeout(id);
  }, [status]);

  async function setAsBackground() {
    if (!activeItem) return;
    setStatus("saving");
    const wallpaper = useWallpaperStore.getState();
    const previousAssetId = wallpaper.single?.assetId ?? null;
    try {
      const source = await readImageAsset(activeItem.assetId);
      if (!source) {
        setStatus("error");
        return;
      }
      const copyId = createAssetId("wallpaper");
      await wallpaperAssets.save({
        id: copyId,
        fileName: source.fileName,
        mimeType: source.mimeType,
        size: source.size,
        blob: source.blob,
      });
      const item: MediaImageItem = {
        assetId: copyId,
        fileName: source.fileName,
        mimeType: source.mimeType,
        size: source.size,
      };
      wallpaper.setSource("custom");
      wallpaper.setMode("single");
      wallpaper.setSingle(item);
      await wallpaperAssets.remove(previousAssetId).catch(() => undefined);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return { setAsBackground, canSet: Boolean(activeItem), status };
}
