import {
  clearImageMediaMemoryStoreForTest,
  deleteImageAsset,
  readImageAsset,
  saveImageAsset,
  validateImageFile,
} from "@/widgets/image/media";
import { IMAGE_MAX_BYTES } from "@/widgets/image/types";

function makeFile(type: string, size: number, name = "pic.png"): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("validateImageFile", () => {
  it("rejects unsupported types", () => {
    expect(validateImageFile(makeFile("image/svg+xml", 10))).toBe("Use a PNG, JPG, WebP, or GIF image.");
  });

  it("rejects files over the size limit", () => {
    expect(validateImageFile(makeFile("image/png", IMAGE_MAX_BYTES + 1))).toBe(
      "Use an image smaller than 5 MB.",
    );
  });

  it("accepts a valid image", () => {
    expect(validateImageFile(makeFile("image/png", 1024))).toBeNull();
  });
});

describe("image media store", () => {
  beforeEach(() => {
    clearImageMediaMemoryStoreForTest();
  });

  it("saves an asset and reads back its blob", async () => {
    const metadata = await saveImageAsset(makeFile("image/png", 2048, "photo.png"));
    expect(metadata).toMatchObject({ fileName: "photo.png", mimeType: "image/png", size: 2048 });

    const asset = await readImageAsset(metadata.id);
    expect(asset?.blob.size).toBe(2048);
  });

  it("deletes an asset", async () => {
    const metadata = await saveImageAsset(makeFile("image/png", 1024));
    await deleteImageAsset(metadata.id);
    expect(await readImageAsset(metadata.id)).toBeNull();
  });

  it("rejects saving an invalid file", async () => {
    await expect(saveImageAsset(makeFile("application/pdf", 1024))).rejects.toThrow();
  });
});
