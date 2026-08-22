import { beforeEach, describe, expect, it } from "vitest";
import { clearImageMediaMemoryStoreForTest, imageAssetStore } from "@/widgets/image/media";
import {
  DEFAULT_IMAGE_CONFIG,
  referencedAssetIds,
  useImageStore,
} from "@/widgets/image/useImageStore";
import type { ImageItem } from "@/widgets/image/types";

function makeItem(id: string): ImageItem {
  return { assetId: id, fileName: `${id}.webp`, mimeType: "image/webp", size: 8 };
}

async function seedAsset(id: string) {
  await imageAssetStore.save({
    id,
    fileName: `${id}.webp`,
    mimeType: "image/webp",
    size: 8,
    blob: new Blob(["x"], { type: "image/webp" }),
  });
}

const base = { ...DEFAULT_IMAGE_CONFIG, mode: "multi" as const };

beforeEach(() => {
  clearImageMediaMemoryStoreForTest();
  useImageStore.setState({ byInstance: {}, indices: {}, unreadable: false });
});

describe("referencedAssetIds", () => {
  it("collects both the single image and every pooled one, across widgets", () => {
    const ids = referencedAssetIds({
      a: { ...base, single: makeItem("s1") },
      b: { ...base, items: [makeItem("p1"), makeItem("p2")] },
    });

    expect([...ids].sort()).toEqual(["p1", "p2", "s1"]);
  });
});

describe("forgetOrphanedAssets", () => {
  it("deletes a blob no widget points at any more", async () => {
    await seedAsset("kept");
    await seedAsset("orphan");
    useImageStore.setState({ byInstance: { a: { ...base, items: [makeItem("kept")] } } });

    await useImageStore.getState().forgetOrphanedAssets();

    expect(await imageAssetStore.read("kept")).not.toBeNull();
    expect(await imageAssetStore.read("orphan")).toBeNull();
  });

  it("leaves every blob alone while the widget data is unreadable", async () => {
    await seedAsset("orphan");
    useImageStore.setState({ byInstance: {}, unreadable: true });

    await useImageStore.getState().forgetOrphanedAssets();

    expect(await imageAssetStore.read("orphan")).not.toBeNull();
  });
});
