// @vitest-environment jsdom
import { galleryItemFor } from "@/lib/gallery-asset";
import { GALLERY_WALLPAPERS } from "@/lib/wallpaper-gallery";

describe("gallery assets", () => {
  it("returns nothing for an id that is not in the gallery", () => {
    expect(galleryItemFor("not-a-wallpaper")).toBeNull();
  });

  it("ships at least one wallpaper so the gallery default can never dangle", () => {
    expect(GALLERY_WALLPAPERS.length).toBeGreaterThan(0);
  });
});
