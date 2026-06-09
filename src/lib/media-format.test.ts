import { formatFileSize, getImageTypeLabel, getMetadataLabel } from "@/lib/media-format";

describe("getImageTypeLabel", () => {
  it("returns the uppercased subtype, normalizing jpeg to jpg", () => {
    expect(getImageTypeLabel("image/jpeg")).toBe("JPG");
    expect(getImageTypeLabel("image/png")).toBe("PNG");
  });

  it("returns null for an empty mime type", () => {
    expect(getImageTypeLabel(null)).toBeNull();
  });
});

describe("formatFileSize", () => {
  it("formats bytes under a megabyte as kilobytes", () => {
    expect(formatFileSize(2048)).toBe("2 KB");
  });

  it("formats megabytes with one decimal under 10 MB", () => {
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0 MB");
  });

  it("returns null when size is null", () => {
    expect(formatFileSize(null)).toBeNull();
  });
});

describe("getMetadataLabel", () => {
  it("joins type and size with a separator", () => {
    expect(getMetadataLabel("image/png", 2048)).toBe("PNG · 2 KB");
  });

  it("returns null when nothing is available", () => {
    expect(getMetadataLabel(null, null)).toBeNull();
  });
});
