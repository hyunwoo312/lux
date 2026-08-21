// @vitest-environment jsdom
import { encodeToWebp } from "@/lib/image-encode";
import {
  MAX_WALLPAPER_IMAGES,
  WALLPAPER_ENCODE_QUALITY,
  resolveWallpaperSource,
  useWallpaperStore,
  wallpaperAssets,
} from "@/stores/useWallpaperStore";

vi.mock("@/lib/image-encode", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/image-encode")>()),
  encodeToWebp: vi.fn(),
}));

const encodeMock = vi.mocked(encodeToWebp);

const store = () => useWallpaperStore.getState();

function jpeg(bytes: number): Blob {
  return new Blob([new Uint8Array(bytes)], { type: "image/jpeg" });
}

function webp(bytes: number): Blob {
  return new Blob([new Uint8Array(bytes)], { type: "image/webp" });
}

async function seedAsset(assetId: string, blob: Blob): Promise<void> {
  await wallpaperAssets.save({
    id: assetId,
    fileName: "shot",
    mimeType: blob.type,
    size: blob.size,
    blob,
  });
}

function item(assetId: string, mimeType: string, size: number) {
  return { assetId, fileName: "shot", mimeType, size };
}

describe("optimizeAssets", () => {
  beforeEach(() => {
    encodeMock.mockReset();
    wallpaperAssets.clearMemoryForTest();
    localStorage.clear();
    useWallpaperStore.setState({ single: null, items: [], mode: "multi" });
  });

  it("re-encodes an unoptimized background and records the new encoding", async () => {
    await seedAsset("a", jpeg(1000));
    useWallpaperStore.setState({ items: [item("a", "image/jpeg", 1000)] });
    encodeMock.mockResolvedValue(webp(400));

    await store().optimizeAssets();

    expect(encodeMock).toHaveBeenCalledWith(expect.any(Blob), {
      quality: WALLPAPER_ENCODE_QUALITY,
    });
    expect(store().items[0]).toMatchObject({ mimeType: "image/webp", size: 400 });

    const stored = await wallpaperAssets.read("a");
    expect(stored?.blob.type).toBe("image/webp");
    expect(stored?.size).toBe(400);
  });

  it("re-encodes the single background too", async () => {
    await seedAsset("s", jpeg(1000));
    useWallpaperStore.setState({ mode: "single", single: item("s", "image/jpeg", 1000) });
    encodeMock.mockResolvedValue(webp(250));

    await store().optimizeAssets();

    expect(store().single).toMatchObject({ mimeType: "image/webp", size: 250 });
  });

  it("skips backgrounds that are already WebP", async () => {
    await seedAsset("a", webp(500));
    useWallpaperStore.setState({ items: [item("a", "image/webp", 500)] });

    await store().optimizeAssets();

    expect(encodeMock).not.toHaveBeenCalled();
    expect(store().items[0]).toMatchObject({ mimeType: "image/webp", size: 500 });
  });

  it("leaves the item untouched when re-encoding would not help", async () => {
    const original = jpeg(1000);
    await seedAsset("a", original);
    useWallpaperStore.setState({ items: [item("a", "image/jpeg", 1000)] });
    encodeMock.mockImplementation(async (blob) => blob);

    await store().optimizeAssets();

    expect(store().items[0]).toMatchObject({ mimeType: "image/jpeg", size: 1000 });
  });

  it("only sweeps once a day so a stubborn image is not retried every new tab", async () => {
    await seedAsset("a", jpeg(1000));
    useWallpaperStore.setState({ items: [item("a", "image/jpeg", 1000)] });
    encodeMock.mockImplementation(async (blob) => blob);

    await store().optimizeAssets();
    await store().optimizeAssets();

    expect(encodeMock).toHaveBeenCalledTimes(1);
  });

  it("sweeps again once the interval has elapsed", async () => {
    await seedAsset("a", jpeg(1000));
    useWallpaperStore.setState({ items: [item("a", "image/jpeg", 1000)] });
    encodeMock.mockImplementation(async (blob) => blob);

    await store().optimizeAssets();
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    localStorage.setItem("lux.wallpaper.optimized-at", String(twoDaysAgo));
    await store().optimizeAssets();

    expect(encodeMock).toHaveBeenCalledTimes(2);
  });
});

describe("optimizeAssets resilience", () => {
  beforeEach(() => {
    encodeMock.mockReset();
    wallpaperAssets.clearMemoryForTest();
    localStorage.clear();
    useWallpaperStore.setState({ single: null, items: [], mode: "multi" });
  });

  it("keeps converting later backgrounds when one of them fails", async () => {
    await seedAsset("a", jpeg(1000));
    await seedAsset("b", jpeg(1000));
    useWallpaperStore.setState({
      items: [item("a", "image/jpeg", 1000), item("b", "image/jpeg", 1000)],
    });
    encodeMock.mockRejectedValueOnce(new Error("decode blew up")).mockResolvedValueOnce(webp(300));

    await expect(store().optimizeAssets()).resolves.toBeUndefined();

    expect(store().items[0]).toMatchObject({ mimeType: "image/jpeg", size: 1000 });
    expect(store().items[1]).toMatchObject({ mimeType: "image/webp", size: 300 });
  });

  it("ignores items whose asset is no longer in storage", async () => {
    useWallpaperStore.setState({ items: [item("gone", "image/jpeg", 1000)] });

    await expect(store().optimizeAssets()).resolves.toBeUndefined();

    expect(encodeMock).not.toHaveBeenCalled();
    expect(store().items[0]).toMatchObject({ mimeType: "image/jpeg" });
  });
});

describe("wallpaper source migration", () => {
  it("defaults a fresh install to the generated source", () => {
    expect(useWallpaperStore.getInitialState().source).toBe("generated");
  });

  it("moves an existing uploader to the custom source rather than the new default", () => {
    expect(resolveWallpaperSource(undefined, true, "generated")).toBe("custom");
  });

  it("leaves a user with no images on the default source", () => {
    expect(resolveWallpaperSource(undefined, false, "generated")).toBe("generated");
  });

  it("never overrides a source the user has already chosen", () => {
    expect(resolveWallpaperSource("gallery", true, "generated")).toBe("gallery");
    expect(resolveWallpaperSource("generated", true, "custom")).toBe("generated");
  });

  it("clamps generated intensity into the allowed band, on 0.05 steps", () => {
    const { setGeneratedIntensity } = useWallpaperStore.getState();
    setGeneratedIntensity(5);
    expect(useWallpaperStore.getState().generatedIntensity).toBe(1);
    setGeneratedIntensity(-1);
    expect(useWallpaperStore.getState().generatedIntensity).toBe(0.2);
    setGeneratedIntensity(0.63);
    expect(useWallpaperStore.getState().generatedIntensity).toBe(0.65);
  });

  it("caps gallery selections at the image limit", () => {
    const ids = Array.from({ length: 30 }, (_, i) => `wp${i}`);
    useWallpaperStore.getState().setGalleryItems(ids);
    expect(useWallpaperStore.getState().galleryItems).toHaveLength(MAX_WALLPAPER_IMAGES);
  });
});
