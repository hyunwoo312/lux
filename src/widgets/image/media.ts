import {
  createAssetStore,
  saveMediaAsset,
  validateImageFile as validateImageFileWithLimit,
  type MediaImageItem,
  type StoredAsset,
} from "@/lib/asset-store";
import { IMAGE_ENCODE_QUALITY, IMAGE_MAX_BYTES, IMAGE_MAX_DIMENSION } from "@/widgets/image/types";

export const imageAssetStore = createAssetStore("lux.image-media");

const IMAGE_NEWTAB_QUEUE_KEY = "lux.image.newtab-queue";

export function imageNewtabQueueKey(instanceId: string): string {
  return `${IMAGE_NEWTAB_QUEUE_KEY}.${instanceId}`;
}

export function validateImageFile(file: File): string | null {
  return validateImageFileWithLimit(file, IMAGE_MAX_BYTES);
}

export async function saveImageAsset(file: File): Promise<MediaImageItem> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  return saveMediaAsset(imageAssetStore, file, {
    prefix: "image",
    fallbackName: "Image",
    quality: IMAGE_ENCODE_QUALITY,
    maxDimension: IMAGE_MAX_DIMENSION,
  });
}

export async function readImageAsset(assetId: string): Promise<StoredAsset | null> {
  return imageAssetStore.read(assetId);
}

export async function deleteImageAsset(assetId: string | null | undefined): Promise<void> {
  await imageAssetStore.remove(assetId);
}

export function clearImageMediaMemoryStoreForTest(): void {
  imageAssetStore.clearMemoryForTest();
}
