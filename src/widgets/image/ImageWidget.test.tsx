// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ImageWidget } from "@/widgets/image/ImageWidget";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { DEFAULT_IMAGE_CONFIG, useImageStore } from "@/widgets/image/useImageStore";
import type { ImageItem } from "@/widgets/image/types";

const ID = "image-1";

function makeItem(id: string): ImageItem {
  return { assetId: id, fileName: `${id}.webp`, mimeType: "image/webp", size: 8 };
}

const base = DEFAULT_IMAGE_CONFIG;

function renderWidget() {
  return render(
    <WidgetInstanceContext.Provider value={ID}>
      <ImageWidget editing={false} />
    </WidgetInstanceContext.Provider>,
  );
}

beforeEach(() => {
  useImageStore.setState({ byInstance: { [ID]: { ...base } }, indices: {}, unreadable: false });
});

describe("ImageWidget", () => {
  it("never turns the photo itself into a file picker", () => {
    useImageStore.setState({ byInstance: { [ID]: { ...base, single: makeItem("a1") } } });
    renderWidget();

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("advances the pool on click only when that trigger is on", () => {
    useImageStore.setState({
      byInstance: {
        [ID]: {
          ...base,
          mode: "multi",
          rotateOnClick: true,
          items: [makeItem("a"), makeItem("b")],
        },
      },
      indices: { [ID]: 0 },
    });
    renderWidget();

    fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    expect(useImageStore.getState().indices[ID]).not.toBe(0);
  });

  it("leaves a single-image pool inert even with click rotation on", () => {
    useImageStore.setState({
      byInstance: { [ID]: { ...base, mode: "multi", rotateOnClick: true, items: [makeItem("a")] } },
    });
    renderWidget();

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("unreadable saved data", () => {
  beforeEach(() => {
    useImageStore.setState({ byInstance: { [ID]: { ...base } }, indices: {}, unreadable: true });
  });

  it("says nothing is being overwritten rather than offering a blank upload target", () => {
    renderWidget();

    expect(screen.getByText(/could not be read/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add image/i })).not.toBeInTheDocument();
  });

  it("lets the owner deliberately start over", () => {
    renderWidget();

    fireEvent.click(screen.getByRole("button", { name: "Start fresh" }));
    expect(useImageStore.getState().unreadable).toBe(false);
  });
});
