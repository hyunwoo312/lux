import type { AssetStore, StoredAsset } from "@/lib/asset-store";

const BLUR_PX = 20;
const SATURATE = 1.5;
const MAX_EDGE = 512;
const ENCODE_TYPE = "image/webp";
const ENCODE_QUALITY = 1;

export const FROST_VERSION = 1;

export async function renderFrost(source: Blob): Promise<Blob | null> {
  if (typeof createImageBitmap !== "function") return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source);
  } catch {
    return null;
  }

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.filter = `blur(${BLUR_PX * scale}px) saturate(${SATURATE})`;
    context.drawImage(bitmap, 0, 0, width, height);
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((blob) => resolve(blob), ENCODE_TYPE, ENCODE_QUALITY),
    );
  } catch {
    return null;
  } finally {
    bitmap.close();
  }
}

function hasCurrentFrost(asset: StoredAsset): boolean {
  return Boolean(asset.frost) && asset.frostVersion === FROST_VERSION;
}

export async function resolveFrost(store: AssetStore, asset: StoredAsset): Promise<Blob | null> {
  if (hasCurrentFrost(asset)) return asset.frost ?? null;
  const frost = await renderFrost(asset.blob);
  if (!frost) return null;
  await store.save({ ...asset, frost, frostVersion: FROST_VERSION }).catch(() => undefined);
  return frost;
}
