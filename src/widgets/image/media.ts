import {
  createAssetId,
  createAssetStore,
  validateImageFile as validateImageFileWithLimit,
  type StoredAsset,
  type StoredAssetMetadata,
} from "@/lib/asset-store";
import { IMAGE_MAX_BYTES } from "@/widgets/image/types";

export type ImageMediaAsset = StoredAsset;
export type ImageMediaMetadata = StoredAssetMetadata;

export const imageAssetStore = createAssetStore("lux.image-media");

const IMAGE_NEWTAB_QUEUE_KEY = "lux.image.newtab-queue";

export function imageNewtabQueueKey(instanceId: string): string {
  return `${IMAGE_NEWTAB_QUEUE_KEY}.${instanceId}`;
}

export function validateImageFile(file: File): string | null {
  return validateImageFileWithLimit(file, IMAGE_MAX_BYTES);
}

function toMetadata(asset: ImageMediaAsset): ImageMediaMetadata {
  return {
    id: asset.id,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    size: asset.size,
  };
}

export async function saveImageAsset(file: File): Promise<ImageMediaMetadata> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const asset: ImageMediaAsset = {
    id: createAssetId("image"),
    fileName: file.name || "Image",
    mimeType: file.type,
    size: file.size,
    blob: file,
  };

  await imageAssetStore.save(asset);
  return toMetadata(asset);
}

export async function readImageAsset(assetId: string): Promise<ImageMediaAsset | null> {
  return imageAssetStore.read(assetId);
}

export async function deleteImageAsset(assetId: string | null | undefined): Promise<void> {
  await imageAssetStore.remove(assetId);
}

export function clearImageMediaMemoryStoreForTest(): void {
  imageAssetStore.clearMemoryForTest();
}
