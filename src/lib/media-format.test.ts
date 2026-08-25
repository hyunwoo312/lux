import { getMetadataLabel } from "@/lib/media-format";

describe("getMetadataLabel", () => {
  it("names the type and the size, normalizing jpeg to jpg", () => {
    expect(getMetadataLabel("image/jpeg", 2048)).toBe("JPG · 2 KB");
    expect(getMetadataLabel("image/png", 2 * 1024 * 1024)).toBe("PNG · 2.0 MB");
  });

  it("keeps whichever half it was given", () => {
    expect(getMetadataLabel("image/png", null)).toBe("PNG");
    expect(getMetadataLabel(null, 2048)).toBe("2 KB");
  });

  it("returns null when it has neither", () => {
    expect(getMetadataLabel(null, null)).toBeNull();
  });
});
