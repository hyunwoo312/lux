import type { AssetStore, StoredAsset } from "@/lib/asset-store";

type DerivedKey = "frost" | "thumb";

type DerivedOptions = {
  key: DerivedKey;
  version: number;
  render: (source: Blob) => Promise<Blob | null>;
};

export async function resolveDerived(
  store: AssetStore,
  asset: StoredAsset,
  { key, version, render }: DerivedOptions,
): Promise<Blob | null> {
  const stored = asset[key];
  if (stored && asset[`${key}Version`] === version) return stored;
  const blob = await render(asset.blob);
  if (!blob) return null;
  const derived: StoredAsset = { ...asset, [key]: blob, [`${key}Version`]: version };
  await store.save(derived).catch(() => undefined);
  return blob;
}
