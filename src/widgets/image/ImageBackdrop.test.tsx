// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { clearImageMediaMemoryStoreForTest, imageAssetStore } from "@/widgets/image/media";
import { ImageBackdrop } from "@/widgets/image/ImageBackdrop";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { DEFAULT_IMAGE_CONFIG, useImageStore } from "@/widgets/image/useImageStore";
import type { ImageItem } from "@/widgets/image/types";

const ID = "image-1";

function makeItem(id: string, caption?: string): ImageItem {
  return { assetId: id, fileName: `${id}.webp`, mimeType: "image/webp", size: 8, caption };
}

async function seedAsset(id: string, withThumb: boolean) {
  await imageAssetStore.save({
    id,
    fileName: `${id}.webp`,
    mimeType: "image/webp",
    size: 8,
    blob: new Blob(["full"], { type: "image/webp" }),
    ...(withThumb ? { thumb: new Blob(["thumb"], { type: "image/webp" }), thumbVersion: 1 } : {}),
  });
}

const base = DEFAULT_IMAGE_CONFIG;

const thumbnails = () => document.querySelectorAll('img[aria-hidden="true"]');

function renderBackdrop() {
  return render(
    <WidgetInstanceContext.Provider value={ID}>
      <ImageBackdrop />
    </WidgetInstanceContext.Provider>,
  );
}

beforeEach(() => {
  clearImageMediaMemoryStoreForTest();
  useImageStore.setState({ byInstance: {}, indices: {}, unreadable: false });
});

describe("ImageBackdrop", () => {
  it("paints the stored thumbnail before the full image has decoded", async () => {
    await seedAsset("a1", true);
    useImageStore.setState({ byInstance: { [ID]: { ...base, single: makeItem("a1") } } });
    renderBackdrop();

    await waitFor(() => expect(document.querySelectorAll("img")).toHaveLength(2));
  });

  it("drops the thumbnail once the full image has loaded", async () => {
    await seedAsset("a1", true);
    useImageStore.setState({ byInstance: { [ID]: { ...base, single: makeItem("a1") } } });
    renderBackdrop();

    await waitFor(() => expect(document.querySelectorAll("img")).toHaveLength(2));
    fireEvent.load(await screen.findByAltText("a1.webp"));
    await waitFor(() => expect(document.querySelectorAll("img")).toHaveLength(1));
  });

  it("still shows the image when no thumbnail was ever rendered", async () => {
    await seedAsset("a1", false);
    useImageStore.setState({ byInstance: { [ID]: { ...base, single: makeItem("a1") } } });
    renderBackdrop();

    await waitFor(() => expect(document.querySelectorAll("img")).toHaveLength(1));
  });

  it("describes the image by its caption rather than its file name", async () => {
    await seedAsset("a1", false);
    useImageStore.setState({
      byInstance: { [ID]: { ...base, single: makeItem("a1", "Sunrise over the bay") } },
    });
    renderBackdrop();

    expect(await screen.findByAltText("Sunrise over the bay")).toBeInTheDocument();
  });

  it("falls back to the file name when there is no caption", async () => {
    await seedAsset("a1", false);
    useImageStore.setState({ byInstance: { [ID]: { ...base, single: makeItem("a1") } } });
    renderBackdrop();

    expect(await screen.findByAltText("a1.webp")).toBeInTheDocument();
  });

  it("paints the thumbnail again after switching to another image", async () => {
    await seedAsset("a1", true);
    await seedAsset("a2", true);
    useImageStore.setState({
      byInstance: {
        [ID]: {
          ...base,
          mode: "multi",
          rotateOnNewtab: false,
          items: [makeItem("a1"), makeItem("a2")],
        },
      },
      indices: { [ID]: 0 },
    });
    renderBackdrop();

    fireEvent.load(await screen.findByAltText("a1.webp"));
    await waitFor(() => expect(thumbnails()).toHaveLength(0));

    useImageStore.getState().setCurrentIndex(ID, 1);

    await waitFor(() => expect(thumbnails()).toHaveLength(1));
  });

  it("clears a reference whose file has gone so the widget can offer an upload again", async () => {
    useImageStore.setState({ byInstance: { [ID]: { ...base, single: makeItem("missing") } } });
    renderBackdrop();

    await waitFor(() => expect(useImageStore.getState().byInstance[ID]?.single).toBeNull());
  });
});
