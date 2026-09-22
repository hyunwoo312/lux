import type { AssetStore, StoredAsset } from "@/lib/asset-store";
import { resolveDerived } from "@/lib/derived-asset";
import { renderBitmap } from "@/lib/image-encode";

const BLUR_PX = 20;
const SATURATE = 1.5;
const MAX_EDGE = 512;
const ENCODE_TYPE = "image/webp";
const ENCODE_QUALITY = 1;

export const FROST_VERSION = 1;

export async function renderFrost(source: Blob): Promise<Blob | null> {
  const rendered = await renderBitmap(source, {
    maxEdge: MAX_EDGE,
    filter: (scale) => `blur(${BLUR_PX * scale}px) saturate(${SATURATE})`,
    type: ENCODE_TYPE,
    quality: ENCODE_QUALITY,
  });
  return rendered?.blob ?? null;
}

export function resolveFrost(store: AssetStore, asset: StoredAsset): Promise<Blob | null> {
  return resolveDerived(store, asset, {
    key: "frost",
    version: FROST_VERSION,
    render: renderFrost,
  });
}
