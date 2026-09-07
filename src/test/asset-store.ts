import type { AssetStore, StoredAsset } from "@/lib/asset-store";

const databases = new Map<string, Map<string, StoredAsset>>();

function assetBytes(asset: StoredAsset): number {
  return asset.size + (asset.frost?.size ?? 0) + (asset.thumb?.size ?? 0);
}

export function memoryAssetStore(databaseName: string): AssetStore {
  const memory = databases.get(databaseName) ?? new Map<string, StoredAsset>();
  databases.set(databaseName, memory);
  return {
    async save(asset) {
      memory.set(asset.id, asset);
    },
    async read(id) {
      return id ? (memory.get(id) ?? null) : null;
    },
    async remove(id) {
      if (id) memory.delete(id);
    },
    async keys() {
      return new Set(memory.keys());
    },
    async usage() {
      return [...memory.values()].reduce(
        (total, asset) => ({ count: total.count + 1, bytes: total.bytes + assetBytes(asset) }),
        { count: 0, bytes: 0 },
      );
    },
  };
}

export function resetAssetStores(): void {
  for (const memory of databases.values()) memory.clear();
}
