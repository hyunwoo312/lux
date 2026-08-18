import { encodeToWebp, isOptimizedMimeType, scaledDimensions } from "@/lib/image-encode";

const QUALITY = 0.9;
const CAP = 2560;

describe("isOptimizedMimeType", () => {
  it("treats WebP and GIF as already optimized", () => {
    expect(isOptimizedMimeType("image/webp")).toBe(true);
    expect(isOptimizedMimeType("image/gif")).toBe(true);
  });

  it("treats other image types as convertible", () => {
    expect(isOptimizedMimeType("image/png")).toBe(false);
    expect(isOptimizedMimeType("image/jpeg")).toBe(false);
    expect(isOptimizedMimeType("")).toBe(false);
  });
});

describe("scaledDimensions", () => {
  it("keeps dimensions when within the cap", () => {
    expect(scaledDimensions(1000, 600, CAP)).toEqual({ width: 1000, height: 600 });
  });

  it("scales the longest edge down to the cap and preserves aspect ratio", () => {
    expect(scaledDimensions(5120, 2560, CAP)).toEqual({ width: CAP, height: CAP / 2 });
  });

  it("scales a portrait source by its longest edge", () => {
    expect(scaledDimensions(2160, 3840, CAP)).toEqual({ width: 1440, height: CAP });
  });

  it("scales to whichever cap the caller passed", () => {
    expect(scaledDimensions(7680, 4320, 3840)).toEqual({ width: 3840, height: 2160 });
  });
});

describe("encodeToWebp", () => {
  it("returns animated GIFs untouched so they keep animating", async () => {
    const gif = new File([new Uint8Array(8)], "loop.gif", { type: "image/gif" });
    await expect(encodeToWebp(gif, { quality: QUALITY })).resolves.toBe(gif);
  });

  it("returns WebP input untouched rather than re-encoding it", async () => {
    const webp = new File([new Uint8Array(8)], "shot.webp", { type: "image/webp" });
    await expect(encodeToWebp(webp, { quality: QUALITY })).resolves.toBe(webp);
  });

  it("returns the original when the platform cannot decode images", async () => {
    const png = new File([new Uint8Array(8)], "shot.png", { type: "image/png" });
    await expect(encodeToWebp(png, { quality: QUALITY })).resolves.toBe(png);
  });
});
