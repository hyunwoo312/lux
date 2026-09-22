import type { AssetStore, StoredAsset } from "@/lib/asset-store";
import { resolveDerived } from "@/lib/derived-asset";
import { renderBitmap } from "@/lib/image-encode";

const MAX_EDGE = 320;
const QUALITY = 0.7;

export const THUMB_VERSION = 1;

export async function renderThumbnail(source: Blob): Promise<Blob | null> {
  const rendered = await renderBitmap(source, {
    maxEdge: MAX_EDGE,
    type: "image/webp",
    quality: QUALITY,
  });
  return rendered?.resized ? rendered.blob : null;
}

export async function resolveThumb(store: AssetStore, asset: StoredAsset): Promise<Blob> {
  const thumb = await resolveDerived(store, asset, {
    key: "thumb",
    version: THUMB_VERSION,
    render: renderThumbnail,
  });
  return thumb ?? asset.blob;
}
