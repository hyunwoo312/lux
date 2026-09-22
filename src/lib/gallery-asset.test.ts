// @vitest-environment jsdom
import { galleryItemFor } from "@/lib/gallery-asset";

describe("gallery assets", () => {
  it("returns nothing for an id that is not in the gallery", () => {
    expect(galleryItemFor("not-a-wallpaper")).toBeNull();
  });
});
