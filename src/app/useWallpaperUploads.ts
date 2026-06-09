import { useState } from "react";
import { createAssetId, validateImageFile, type MediaImageItem } from "@/lib/asset-store";
import {
  MAX_WALLPAPER_IMAGES,
  WALLPAPER_MAX_BYTES,
  useWallpaperStore,
  wallpaperAssets,
} from "@/stores/useWallpaperStore";

async function saveWallpaperAsset(file: File): Promise<MediaImageItem> {
  const asset = {
    id: createAssetId("wallpaper"),
    fileName: file.name || "Background",
    mimeType: file.type,
    size: file.size,
    blob: file,
  };
  await wallpaperAssets.save(asset);
  return { assetId: asset.id, fileName: asset.fileName, mimeType: asset.mimeType, size: asset.size };
}

export function useWallpaperUploads() {
  const mode = useWallpaperStore((s) => s.mode);
  const single = useWallpaperStore((s) => s.single);
  const items = useWallpaperStore((s) => s.items);
  const setSingle = useWallpaperStore((s) => s.setSingle);
  const setItems = useWallpaperStore((s) => s.setItems);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadSingle(file: File) {
    const validationError = validateImageFile(file, WALLPAPER_MAX_BYTES);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    const previousAssetId = single?.assetId ?? null;
    try {
      const saved = await saveWallpaperAsset(file);
      setSingle(saved);
      await wallpaperAssets.remove(previousAssetId).catch(() => undefined);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Image could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function addImages(files: File[]) {
    if (!files.length) return;
    const availableSlots = MAX_WALLPAPER_IMAGES - items.length;
    if (availableSlots <= 0) {
      setError(`Background pool is full — ${MAX_WALLPAPER_IMAGES} images max.`);
      return;
    }
    if (files.length > availableSlots) {
      setError(
        `Add ${availableSlots} more ${availableSlots === 1 ? "image" : "images"} or remove some first.`,
      );
      return;
    }
    const validationError = files
      .map((file) => validateImageFile(file, WALLPAPER_MAX_BYTES))
      .find(Boolean);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    const saved: MediaImageItem[] = [];
    try {
      for (const file of files) {
        saved.push(await saveWallpaperAsset(file));
      }
      setItems([...items, ...saved]);
    } catch (saveError) {
      await Promise.all(
        saved.map((item) => wallpaperAssets.remove(item.assetId).catch(() => undefined)),
      );
      setError(saveError instanceof Error ? saveError.message : "Images could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function handleFiles(files: File[]) {
    if (mode === "multi") {
      void addImages(files);
      return;
    }
    const [file] = files;
    if (file) void uploadSingle(file);
  }

  async function removeItem(item: MediaImageItem) {
    setSaving(true);
    try {
      setItems(items.filter((candidate) => candidate.assetId !== item.assetId));
      await wallpaperAssets.remove(item.assetId).catch(() => undefined);
    } finally {
      setSaving(false);
    }
  }

  async function clearAll() {
    setSaving(true);
    try {
      if (mode === "multi") {
        const assetIds = items.map((item) => item.assetId);
        setItems([]);
        await Promise.all(assetIds.map((id) => wallpaperAssets.remove(id).catch(() => undefined)));
        return;
      }
      const previousAssetId = single?.assetId ?? null;
      setSingle(null);
      await wallpaperAssets.remove(previousAssetId).catch(() => undefined);
    } finally {
      setSaving(false);
    }
  }

  return { saving, error, handleFiles, removeItem, clearAll };
}
