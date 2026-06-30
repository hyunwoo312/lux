import { MAX_MULTI_IMAGES, type ImageItem } from "@/widgets/image/types";
import { useImageStore } from "@/widgets/image/useImageStore";

const store = () => useImageStore.getState();
const ID = "image-1";
const config = (instanceId: string) => store().byInstance[instanceId];

function makeItem(id: string): ImageItem {
  return { assetId: id, fileName: `${id}.png`, mimeType: "image/png", size: 1024 };
}

const base = {
  mode: "single" as const,
  single: null,
  items: [] as ImageItem[],
  rotateOnNewtab: true,
  rotateTimed: false,
  rotateOnClick: false,
  intervalSeconds: 30,
  order: "shuffle" as const,
  fit: "cover" as const,
  brightness: "normal" as const,
  hideFrame: false,
};

describe("useImageStore", () => {
  beforeEach(() => {
    useImageStore.setState({ byInstance: { [ID]: { ...base } }, indices: {} });
  });

  it("sets the single image", () => {
    store().setSingle(ID, makeItem("a"));
    expect(config(ID)?.single?.assetId).toBe("a");
  });

  it("caps the image pool at the maximum", () => {
    const items = Array.from({ length: MAX_MULTI_IMAGES + 3 }, (_, index) =>
      makeItem(`item-${index}`),
    );
    store().setItems(ID, items);
    expect(config(ID)?.items).toHaveLength(MAX_MULTI_IMAGES);
  });

  it("clamps the interval into the allowed range", () => {
    store().setIntervalSeconds(ID, 5);
    expect(config(ID)?.intervalSeconds).toBe(15);

    store().setIntervalSeconds(ID, 99999);
    expect(config(ID)?.intervalSeconds).toBe(300);

    store().setIntervalSeconds(ID, 45);
    expect(config(ID)?.intervalSeconds).toBe(45);
  });

  it("updates appearance settings", () => {
    store().setFit(ID, "contain");
    store().setBrightness(ID, "dark");
    store().setHideFrame(ID, true);
    expect(config(ID)).toMatchObject({ fit: "contain", brightness: "dark", hideFrame: true });
  });

  it("advances sequentially through the image pool and wraps", () => {
    useImageStore.setState({
      byInstance: {
        [ID]: {
          ...base,
          mode: "multi",
          order: "sequential",
          items: [makeItem("a"), makeItem("b"), makeItem("c")],
        },
      },
      indices: { [ID]: 0 },
    });

    store().advanceImage(ID);
    expect(store().indices[ID]).toBe(1);
    store().advanceImage(ID);
    store().advanceImage(ID);
    expect(store().indices[ID]).toBe(0);
  });

  it("does not advance a single-image pool", () => {
    useImageStore.setState({
      byInstance: { [ID]: { ...base, mode: "multi", items: [makeItem("a")] } },
      indices: { [ID]: 0 },
    });
    store().advanceImage(ID);
    expect(store().indices[ID]).toBe(0);
  });

  it("drops an instance on cleanup", () => {
    store().removeInstance(ID);
    expect(store().byInstance[ID]).toBeUndefined();
  });

  describe("migrate", () => {
    const migrate = useImageStore.persist.getOptions().migrate;

    it("migrates legacy singleton data under the image instance key", () => {
      const legacy = {
        mode: "multi",
        single: null,
        items: [makeItem("a")],
        rotateOnNewtab: false,
        rotateTimed: true,
        rotateOnClick: true,
        intervalSeconds: 60,
        order: "sequential",
        fit: "contain",
        brightness: "dark",
        hideFrame: true,
      };

      expect(migrate?.(legacy, 1)).toEqual({ byInstance: { image: legacy } });
    });

    it("drops unrecognized legacy data", () => {
      expect(migrate?.({ mode: "bogus" }, 1)).toEqual({ byInstance: {} });
    });

    it("passes current-version data through unchanged", () => {
      const persisted = { byInstance: { [ID]: { ...base } } };
      expect(migrate?.(persisted, 2)).toBe(persisted);
    });
  });
});
