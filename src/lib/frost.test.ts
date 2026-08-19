import { createAssetStore, type StoredAsset } from "@/lib/asset-store";
import { FROST_VERSION, hasCurrentFrost, renderFrost, resolveFrost } from "@/lib/frost";

function asset(overrides: Partial<StoredAsset> = {}): StoredAsset {
  return {
    id: "wallpaper-1",
    fileName: "shot.webp",
    mimeType: "image/webp",
    size: 1000,
    blob: new Blob([new Uint8Array(1000)], { type: "image/webp" }),
    ...overrides,
  };
}

function frostBlob(): Blob {
  return new Blob([new Uint8Array(64)], { type: "image/webp" });
}

describe("hasCurrentFrost", () => {
  it("accepts an asset frosted by the current recipe", () => {
    expect(hasCurrentFrost(asset({ frost: frostBlob(), frostVersion: FROST_VERSION }))).toBe(true);
  });

  it("rejects an asset with no cached frost", () => {
    expect(hasCurrentFrost(asset())).toBe(false);
  });

  it("rejects a frost left over from an older recipe", () => {
    expect(hasCurrentFrost(asset({ frost: frostBlob(), frostVersion: FROST_VERSION - 1 }))).toBe(
      false,
    );
  });

  it("rejects a frost blob with no version stamp", () => {
    expect(hasCurrentFrost(asset({ frost: frostBlob() }))).toBe(false);
  });
});

describe("resolveFrost", () => {
  it("returns the cached frost without touching storage", async () => {
    const store = createAssetStore("lux.test-frost-hit");
    const cached = frostBlob();
    const record = asset({ frost: cached, frostVersion: FROST_VERSION });

    await expect(resolveFrost(store, record)).resolves.toBe(cached);
    expect(await store.read(record.id)).toBeNull();
  });

  it("does not reuse a frost stamped with an older recipe", async () => {
    const store = createAssetStore("lux.test-frost-stale");
    const stale = frostBlob();
    const record = asset({ frost: stale, frostVersion: FROST_VERSION - 1 });

    await expect(resolveFrost(store, record)).resolves.not.toBe(stale);
  });
});

describe("renderFrost", () => {
  it("returns null when the platform cannot decode images", async () => {
    await expect(renderFrost(new Blob([new Uint8Array(8)]))).resolves.toBeNull();
  });
});
