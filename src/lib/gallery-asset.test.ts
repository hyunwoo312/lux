// @vitest-environment jsdom
import { galleryAssetId, galleryItemFor, isGalleryAssetId } from "@/lib/gallery-asset";
import { GALLERY_WALLPAPERS } from "@/lib/wallpaper-gallery";

describe("gallery assets", () => {
  it("maps every shipped wallpaper to a stable asset id", () => {
    for (const wallpaper of GALLERY_WALLPAPERS) {
      const item = galleryItemFor(wallpaper.id);
      expect(item?.assetId).toBe(galleryAssetId(wallpaper.id));
      expect(isGalleryAssetId(item?.assetId ?? "")).toBe(true);
    }
  });

  it("returns nothing for an id that is not in the gallery", () => {
    expect(galleryItemFor("not-a-wallpaper")).toBeNull();
  });

  it("does not mistake an uploaded asset id for a gallery one", () => {
    expect(isGalleryAssetId("wallpaper-abc123")).toBe(false);
  });

  it("ships at least one wallpaper so the gallery default can never dangle", () => {
    expect(GALLERY_WALLPAPERS.length).toBeGreaterThan(0);
    expect(GALLERY_WALLPAPERS.every((w) => w.url && w.thumb && w.name)).toBe(true);
  });
});
