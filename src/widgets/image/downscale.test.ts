import {
  IMAGE_MAX_DIMENSION,
  downscaleImage,
  scaledDimensions,
  shouldReencode,
} from "@/widgets/image/downscale";

describe("shouldReencode", () => {
  it("skips animated GIFs regardless of size", () => {
    expect(shouldReencode("image/gif", IMAGE_MAX_DIMENSION * 4)).toBe(false);
  });

  it("re-encodes when the longest edge is over the cap", () => {
    expect(shouldReencode("image/jpeg", IMAGE_MAX_DIMENSION + 1)).toBe(true);
  });

  it("leaves images at or under the cap untouched", () => {
    expect(shouldReencode("image/png", IMAGE_MAX_DIMENSION)).toBe(false);
    expect(shouldReencode("image/png", 800)).toBe(false);
  });
});

describe("scaledDimensions", () => {
  it("keeps dimensions when within the cap", () => {
    expect(scaledDimensions(1000, 600, IMAGE_MAX_DIMENSION)).toEqual({ width: 1000, height: 600 });
  });

  it("scales the longest edge down to the cap and preserves aspect ratio", () => {
    expect(scaledDimensions(5120, 2560, IMAGE_MAX_DIMENSION)).toEqual({
      width: IMAGE_MAX_DIMENSION,
      height: IMAGE_MAX_DIMENSION / 2,
    });
  });
});

describe("downscaleImage", () => {
  it("returns the original blob for GIFs without touching canvas", async () => {
    const gif = new File([new Uint8Array(8)], "loop.gif", { type: "image/gif" });
    await expect(downscaleImage(gif)).resolves.toBe(gif);
  });
});
