// @vitest-environment jsdom
import type { AssetStore, StoredAsset } from "@/lib/asset-store";
import { hasCurrentThumb, resolveThumb, THUMB_VERSION } from "@/lib/thumbnail";

function makeStore(asset: StoredAsset) {
  const saved: StoredAsset[] = [];
  const store = {
    save: async (next: StoredAsset) => {
      saved.push(next);
    },
    read: async () => asset,
    remove: async () => undefined,
    keys: async () => new Set<string>(),
    usage: async () => ({ count: 0, bytes: 0 }),
  } as unknown as AssetStore;
  return { store, saved };
}

const FULL = new Blob([new Uint8Array(4096)], { type: "image/webp" });
const SMALL = new Blob([new Uint8Array(64)], { type: "image/webp" });

describe("resolveThumb", () => {
  it("returns a stored thumbnail without re-rendering it", async () => {
    const asset: StoredAsset = {
      id: "a",
      fileName: "f",
      mimeType: "image/webp",
      size: FULL.size,
      blob: FULL,
      thumb: SMALL,
      thumbVersion: THUMB_VERSION,
    };
    const { store, saved } = makeStore(asset);

    const result = await resolveThumb(store, asset);

    expect(result).toBe(SMALL);
    expect(saved).toHaveLength(0);
  });

  it("falls back to the full blob when a thumbnail cannot be produced", async () => {
    const asset: StoredAsset = {
      id: "a",
      fileName: "f",
      mimeType: "image/webp",
      size: FULL.size,
      blob: FULL,
    };
    const { store } = makeStore(asset);

    await expect(resolveThumb(store, asset)).resolves.toBe(FULL);
  });

  it("treats a stale thumbnail version as absent", () => {
    const asset: StoredAsset = {
      id: "a",
      fileName: "f",
      mimeType: "image/webp",
      size: FULL.size,
      blob: FULL,
      thumb: SMALL,
      thumbVersion: THUMB_VERSION - 1,
    };
    expect(hasCurrentThumb(asset)).toBe(false);
  });
});
