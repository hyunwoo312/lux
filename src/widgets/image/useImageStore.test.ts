import { MAX_MULTI_IMAGES, type ImageItem } from "@/widgets/image/types";
import { useImageStore } from "@/widgets/image/useImageStore";

const store = () => useImageStore.getState();

function makeItem(id: string): ImageItem {
  return { assetId: id, fileName: `${id}.png`, mimeType: "image/png", size: 1024 };
}

describe("useImageStore", () => {
  beforeEach(() => {
    useImageStore.setState({
      mode: "single",
      single: null,
      items: [],
      rotateOnNewtab: true,
      rotateTimed: false,
      rotateOnClick: false,
      intervalSeconds: 30,
      order: "shuffle",
      fit: "cover",
      brightness: "normal",
      hideFrame: false,
      currentIndex: 0,
    });
  });

  it("sets the single image", () => {
    store().setSingle(makeItem("a"));
    expect(store().single?.assetId).toBe("a");
  });

  it("caps the image pool at the maximum", () => {
    const items = Array.from({ length: MAX_MULTI_IMAGES + 3 }, (_, index) =>
      makeItem(`item-${index}`),
    );
    store().setItems(items);
    expect(store().items).toHaveLength(MAX_MULTI_IMAGES);
  });

  it("clamps the interval into the allowed range", () => {
    store().setIntervalSeconds(5);
    expect(store().intervalSeconds).toBe(15);

    store().setIntervalSeconds(99999);
    expect(store().intervalSeconds).toBe(300);

    store().setIntervalSeconds(45);
    expect(store().intervalSeconds).toBe(45);
  });

  it("updates appearance settings", () => {
    store().setFit("contain");
    store().setBrightness("dark");
    store().setHideFrame(true);
    expect(store()).toMatchObject({ fit: "contain", brightness: "dark", hideFrame: true });
  });

  it("advances sequentially through the image pool and wraps", () => {
    useImageStore.setState({
      mode: "multi",
      order: "sequential",
      items: [makeItem("a"), makeItem("b"), makeItem("c")],
      currentIndex: 0,
    });

    store().advanceImage();
    expect(store().currentIndex).toBe(1);
    store().advanceImage();
    store().advanceImage();
    expect(store().currentIndex).toBe(0);
  });

  it("does not advance a single-image pool", () => {
    useImageStore.setState({ mode: "multi", items: [makeItem("a")], currentIndex: 0 });
    store().advanceImage();
    expect(store().currentIndex).toBe(0);
  });
});
