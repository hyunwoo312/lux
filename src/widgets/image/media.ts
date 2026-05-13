import {
  IMAGE_MAX_BYTES,
  IMAGE_MIME_TYPES,
  type ImageMimeType,
} from "@/widgets/image/types";

export type ImageMediaAsset = {
  id: string;
  fileName: string;
  mimeType: ImageMimeType;
  size: number;
  blob: Blob;
};

export type ImageMediaMetadata = Omit<ImageMediaAsset, "blob">;

const DATABASE_NAME = "lux.image-media";
const DATABASE_VERSION = 1;
const STORE_NAME = "assets";
const memoryAssets = new Map<string, ImageMediaAsset>();

function isSupportedImageMimeType(value: string): value is ImageMimeType {
  return (IMAGE_MIME_TYPES as readonly string[]).includes(value);
}

export function validateImageFile(file: File): string | null {
  if (!isSupportedImageMimeType(file.type)) return "Use a PNG, JPG, WebP, or GIF image.";
  if (file.size > IMAGE_MAX_BYTES) return "Use an image smaller than 5 MB.";
  return null;
}

function createAssetId(): string {
  const value =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `image-${value}`;
}

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onerror = () => reject(request.error ?? new Error("Image media storage failed"));
    request.onsuccess = () => resolve(request.result);
  });
}

function runTransaction<TValue>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<TValue>,
): Promise<TValue> {
  if (!isIndexedDbAvailable()) return Promise.reject(new Error("IndexedDB is unavailable"));

  return openDatabase().then(
    (database) =>
      new Promise<TValue>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const request = operation(transaction.objectStore(STORE_NAME));
        request.onerror = () => reject(request.error ?? new Error("Image media storage failed"));
        request.onsuccess = () => resolve(request.result);
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => {
          database.close();
          reject(transaction.error ?? new Error("Image media storage failed"));
        };
      }),
  );
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
    id: createAssetId(),
    fileName: file.name || "Image",
    mimeType: file.type as ImageMimeType,
    size: file.size,
    blob: file,
  };

  if (!isIndexedDbAvailable()) {
    memoryAssets.set(asset.id, asset);
    return toMetadata(asset);
  }

  await runTransaction("readwrite", (store) => store.put(asset));
  return toMetadata(asset);
}

export async function readImageAsset(assetId: string): Promise<ImageMediaAsset | null> {
  if (!assetId) return null;
  if (!isIndexedDbAvailable()) return memoryAssets.get(assetId) ?? null;

  const asset = await runTransaction<ImageMediaAsset | undefined>(
    "readonly",
    (store) => store.get(assetId) as IDBRequest<ImageMediaAsset | undefined>,
  );
  return asset ?? null;
}

export async function deleteImageAsset(assetId: string | null | undefined): Promise<void> {
  if (!assetId) return;
  if (!isIndexedDbAvailable()) {
    memoryAssets.delete(assetId);
    return;
  }
  await runTransaction("readwrite", (store) => store.delete(assetId));
}

export function clearImageMediaMemoryStoreForTest(): void {
  memoryAssets.clear();
}
