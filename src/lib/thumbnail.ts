import type { AssetStore, StoredAsset } from "@/lib/asset-store";
import { scaledDimensions } from "@/lib/image-encode";

const MAX_EDGE = 320;
const QUALITY = 0.7;

export const THUMB_VERSION = 1;

export async function renderThumbnail(source: Blob): Promise<Blob | null> {
  if (typeof createImageBitmap !== "function") return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source);
  } catch {
    return null;
  }

  try {
    const { width, height } = scaledDimensions(bitmap.width, bitmap.height, MAX_EDGE);
    if (width === bitmap.width && height === bitmap.height) return null;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, width, height);
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((blob) => resolve(blob), "image/webp", QUALITY),
    );
  } catch {
    return null;
  } finally {
    bitmap.close();
  }
}

export function hasCurrentThumb(asset: StoredAsset): boolean {
  return Boolean(asset.thumb) && asset.thumbVersion === THUMB_VERSION;
}

export async function resolveThumb(store: AssetStore, asset: StoredAsset): Promise<Blob> {
  if (hasCurrentThumb(asset)) return asset.thumb ?? asset.blob;
  const thumb = await renderThumbnail(asset.blob);
  if (!thumb) return asset.blob;
  await store.save({ ...asset, thumb, thumbVersion: THUMB_VERSION }).catch(() => undefined);
  return thumb;
}
