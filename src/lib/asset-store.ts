import { useEffect, useState } from "react";

export type StoredAsset = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  blob: Blob;
};

export type StoredAssetMetadata = Omit<StoredAsset, "blob">;

export type MediaImageItem = {
  assetId: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export function validateImageFile(file: File, maxBytes: number): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Use a PNG, JPG, WebP, or GIF image.";
  }
  if (file.size > maxBytes) {
    return `Use an image smaller than ${Math.round(maxBytes / (1024 * 1024))} MB.`;
  }
  return null;
}

export function createAssetId(prefix: string): string {
  const value =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${value}`;
}

const DATABASE_VERSION = 1;
const STORE_NAME = "assets";

export type AssetStore = {
  save: (asset: StoredAsset) => Promise<void>;
  read: (id: string | null | undefined) => Promise<StoredAsset | null>;
  remove: (id: string | null | undefined) => Promise<void>;
  keys: () => Promise<Set<string>>;
  clearMemoryForTest: () => void;
};

export function createAssetStore(databaseName: string): AssetStore {
  const memory = new Map<string, StoredAsset>();

  function isIndexedDbAvailable(): boolean {
    return typeof indexedDB !== "undefined";
  }

  function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onerror = () => reject(request.error ?? new Error("Asset storage failed"));
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
          request.onerror = () => reject(request.error ?? new Error("Asset storage failed"));
          request.onsuccess = () => resolve(request.result);
          transaction.oncomplete = () => database.close();
          transaction.onerror = () => {
            database.close();
            reject(transaction.error ?? new Error("Asset storage failed"));
          };
        }),
    );
  }

  return {
    async save(asset) {
      if (!isIndexedDbAvailable()) {
        memory.set(asset.id, asset);
        return;
      }
      await runTransaction("readwrite", (store) => store.put(asset));
    },
    async read(id) {
      if (!id) return null;
      if (!isIndexedDbAvailable()) return memory.get(id) ?? null;
      const asset = await runTransaction<StoredAsset | undefined>(
        "readonly",
        (store) => store.get(id) as IDBRequest<StoredAsset | undefined>,
      );
      return asset ?? null;
    },
    async remove(id) {
      if (!id) return;
      if (!isIndexedDbAvailable()) {
        memory.delete(id);
        return;
      }
      await runTransaction("readwrite", (store) => store.delete(id));
    },
    async keys() {
      if (!isIndexedDbAvailable()) return new Set(memory.keys());
      const stored = await runTransaction<IDBValidKey[]>("readonly", (store) => store.getAllKeys());
      return new Set(stored.map((key) => String(key)));
    },
    clearMemoryForTest() {
      memory.clear();
    },
  };
}

export async function missingAssetIds<T extends { assetId: string }>(
  store: AssetStore,
  refs: Array<T | null | undefined>,
): Promise<Set<string>> {
  const ids = refs.filter((ref): ref is T => Boolean(ref)).map((ref) => ref.assetId);
  if (!ids.length) return new Set();
  const present = await store.keys();
  return new Set(ids.filter((id) => !present.has(id)));
}

export function useAssetObjectUrl(store: AssetStore, assetId: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!assetId) {
      setUrl(null);
      return;
    }
    let active = true;
    let objectUrl: string | null = null;
    setUrl(null);
    void store
      .read(assetId)
      .then((asset) => {
        if (!active || !asset) return;
        objectUrl = URL.createObjectURL(asset.blob);
        setUrl(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [store, assetId]);

  return url;
}
