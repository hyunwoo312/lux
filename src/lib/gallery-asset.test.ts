// @vitest-environment jsdom
import { galleryAssetId, galleryItemFor } from "@/lib/gallery-asset";
import { GALLERY_WALLPAPERS } from "@/lib/wallpaper-gallery";

describe("gallery assets", () => {
  it("maps every shipped wallpaper to a stable asset id", () => {
    for (const wallpaper of GALLERY_WALLPAPERS) {
      const item = galleryItemFor(wallpaper.id);
      expect(item?.assetId).toBe(galleryAssetId(wallpaper.id));
    }
  });

  it("returns nothing for an id that is not in the gallery", () => {
    expect(galleryItemFor("not-a-wallpaper")).toBeNull();
  });

  it("ships at least one wallpaper so the gallery default can never dangle", () => {
    expect(GALLERY_WALLPAPERS.length).toBeGreaterThan(0);
    expect(GALLERY_WALLPAPERS.every((w) => w.url && w.thumb && w.name)).toBe(true);
  });
});
