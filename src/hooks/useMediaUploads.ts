import { useState } from "react";
import type { MediaImageItem } from "@/lib/asset-store";

type MediaUploads<T extends MediaImageItem> = {
  mode: "single" | "multi";
  single: T | null;
  items: T[];
  maxItems: number;
  poolLabel: string;
  validate: (file: File) => string | null;
  save: (file: File) => Promise<T>;
  remove: (assetId: string | null | undefined) => Promise<void>;
  setSingle: (item: T | null) => void;
  setItems: (items: T[]) => void;
};

type MediaUploadsResult<T> = {
  saving: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  handleFiles: (files: File[]) => void;
  removeItem: (item: T) => Promise<void>;
  clearAll: () => Promise<void>;
};

export function useMediaUploads<T extends MediaImageItem>({
  mode,
  single,
  items,
  maxItems,
  poolLabel,
  validate,
  save,
  remove,
  setSingle,
  setItems,
}: MediaUploads<T>): MediaUploadsResult<T> {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discard = (assetId: string | null | undefined) => remove(assetId).catch(() => undefined);

  async function uploadSingle(file: File) {
    const validationError = validate(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    const previousAssetId = single?.assetId ?? null;
    try {
      setSingle(await save(file));
      await discard(previousAssetId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Image could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function addImages(files: File[]) {
    if (!files.length) return;

    const availableSlots = maxItems - items.length;
    if (availableSlots <= 0) {
      setError(`${poolLabel} is full — ${maxItems} images max.`);
      return;
    }
    if (files.length > availableSlots) {
      setError(
        `Add ${availableSlots} more ${availableSlots === 1 ? "image" : "images"} or remove some first.`,
      );
      return;
    }
    const validationError = files.map(validate).find(Boolean);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    const saved: T[] = [];
    try {
      for (const file of files) {
        saved.push(await save(file));
      }
      setItems([...items, ...saved]);
    } catch (saveError) {
      await Promise.all(saved.map((item) => discard(item.assetId)));
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

  async function removeItem(item: T) {
    setSaving(true);
    try {
      setItems(items.filter((candidate) => candidate.assetId !== item.assetId));
      await discard(item.assetId);
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
        await Promise.all(assetIds.map(discard));
        return;
      }
      const previousAssetId = single?.assetId ?? null;
      setSingle(null);
      await discard(previousAssetId);
    } finally {
      setSaving(false);
    }
  }

  return { saving, error, setError, handleFiles, removeItem, clearAll };
}
