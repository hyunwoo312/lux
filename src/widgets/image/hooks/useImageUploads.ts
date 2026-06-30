import { useState } from "react";
import { deleteImageAsset, saveImageAsset, validateImageFile } from "@/widgets/image/media";
import { MAX_MULTI_IMAGES, type ImageItem } from "@/widgets/image/types";
import { useImage, useImageStore } from "@/widgets/image/useImageStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

function toItem(metadata: {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
}): ImageItem {
  return {
    assetId: metadata.id,
    fileName: metadata.fileName,
    mimeType: metadata.mimeType,
    size: metadata.size,
  };
}

export function useImageUploads() {
  const instanceId = useWidgetInstanceId();
  const mode = useImage((c) => c.mode);
  const single = useImage((c) => c.single);
  const items = useImage((c) => c.items);
  const setSingle = useImageStore((s) => s.setSingle);
  const setItems = useImageStore((s) => s.setItems);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadSingle(file: File) {
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    const previousAssetId = single?.assetId ?? null;
    try {
      const saved = await saveImageAsset(file);
      setSingle(instanceId, toItem(saved));
      await deleteImageAsset(previousAssetId).catch(() => undefined);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Image could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function addImages(files: File[]) {
    if (!files.length) return;

    const availableSlots = MAX_MULTI_IMAGES - items.length;
    if (availableSlots <= 0) {
      setError(`Image pool is full — ${MAX_MULTI_IMAGES} images max.`);
      return;
    }
    if (files.length > availableSlots) {
      setError(
        `Add ${availableSlots} more ${availableSlots === 1 ? "image" : "images"} or remove some first.`,
      );
      return;
    }
    const validationError = files.map(validateImageFile).find(Boolean);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    const saved: ImageItem[] = [];
    try {
      for (const file of files) {
        saved.push(toItem(await saveImageAsset(file)));
      }
      setItems(instanceId, [...items, ...saved]);
    } catch (saveError) {
      await Promise.all(saved.map((item) => deleteImageAsset(item.assetId).catch(() => undefined)));
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

  async function removeItem(item: ImageItem) {
    setSaving(true);
    try {
      setItems(instanceId, items.filter((candidate) => candidate.assetId !== item.assetId));
      await deleteImageAsset(item.assetId).catch(() => undefined);
    } finally {
      setSaving(false);
    }
  }

  async function clearAll() {
    setSaving(true);
    try {
      if (mode === "multi") {
        const assetIds = items.map((item) => item.assetId);
        setItems(instanceId, []);
        await Promise.all(assetIds.map((id) => deleteImageAsset(id).catch(() => undefined)));
        return;
      }
      const previousAssetId = single?.assetId ?? null;
      setSingle(instanceId, null);
      await deleteImageAsset(previousAssetId).catch(() => undefined);
    } finally {
      setSaving(false);
    }
  }

  return { saving, error, setError, handleFiles, removeItem, clearAll };
}
