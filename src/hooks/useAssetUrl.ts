import { useEffect, useState } from "react";
import type { AssetStore, StoredAsset } from "@/lib/asset-store";
import { resolveThumb } from "@/lib/thumbnail";

function useAssetBlobUrl(
  store: AssetStore,
  assetId: string | null,
  pick: (store: AssetStore, asset: StoredAsset) => Promise<Blob> | Blob,
): string | null {
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
      .then(async (asset) => {
        if (!active || !asset) return;
        const blob = await pick(store, asset);
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [store, assetId, pick]);

  return url;
}

const pickFull = (_store: AssetStore, asset: StoredAsset): Blob => asset.blob;

export function useAssetObjectUrl(store: AssetStore, assetId: string | null): string | null {
  return useAssetBlobUrl(store, assetId, pickFull);
}

export function useAssetThumbUrl(store: AssetStore, assetId: string | null): string | null {
  return useAssetBlobUrl(store, assetId, resolveThumb);
}
