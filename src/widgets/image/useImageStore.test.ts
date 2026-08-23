import { MAX_MULTI_IMAGES, type ImageItem } from "@/widgets/image/types";
import { DEFAULT_IMAGE_CONFIG, useImageStore } from "@/widgets/image/useImageStore";

const store = () => useImageStore.getState();
const ID = "image-1";
const config = (instanceId: string) => store().byInstance[instanceId];

function makeItem(id: string): ImageItem {
  return { assetId: id, fileName: `${id}.png`, mimeType: "image/png", size: 1024 };
}

const base = DEFAULT_IMAGE_CONFIG;

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
    store().setTransition(ID, "slide");
    store().setKenBurns(ID, true);
    expect(config(ID)).toMatchObject({
      fit: "contain",
      brightness: "dark",
      hideFrame: true,
      transition: "slide",
      kenBurns: true,
    });
  });

  it("updates a caption and focal point on the matching item", () => {
    useImageStore.setState({
      byInstance: {
        [ID]: { ...base, mode: "multi", items: [makeItem("a"), makeItem("b")] },
      },
      indices: {},
    });

    store().updateItem(ID, "b", { caption: "Sunset", focal: { x: 0.25, y: 0.75 } });

    const items = config(ID)?.items ?? [];
    expect(items[0]?.assetId).toBe("a");
    expect(items[0]?.caption).toBeUndefined();
    expect(items[1]).toMatchObject({
      assetId: "b",
      caption: "Sunset",
      focal: { x: 0.25, y: 0.75 },
    });
  });

  it("updates a caption on the single image", () => {
    useImageStore.setState({
      byInstance: { [ID]: { ...base, single: makeItem("solo") } },
      indices: {},
    });
    store().updateItem(ID, "solo", { caption: "Hello" });
    expect(config(ID)?.single).toMatchObject({ assetId: "solo", caption: "Hello" });
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
        transition: "slide",
        kenBurns: true,
      };

      expect(migrate?.(legacy, 1)).toEqual({ byInstance: { image: legacy } });
    });

    it("does not invent a widget out of a blob with nothing recognisable in it", () => {
      expect(migrate?.({}, 1)).toEqual({ byInstance: {} });
      expect(migrate?.({ somethingElse: 1 }, 1)).toEqual({ byInstance: {} });
      expect(migrate?.("nonsense", 1)).toEqual({ byInstance: {} });
    });

    it("keeps the uploaded images when one legacy setting is unreadable", () => {
      const migrated = migrate?.({ mode: "bogus", items: [makeItem("a1")] }, 1) as {
        byInstance: Record<string, { mode: string; items: unknown[] }>;
      };

      expect(migrated.byInstance["image"]?.mode).toBe("single");
      expect(migrated.byInstance["image"]?.items).toHaveLength(1);
    });

    it("passes current-version data through unchanged", () => {
      const persisted = { byInstance: { [ID]: { ...base } } };
      expect(migrate?.(persisted, 2)).toBe(persisted);
    });
  });

  describe("merge", () => {
    const merge = useImageStore.persist.getOptions().merge;
    const mergeInto = (persisted: unknown) =>
      merge?.(persisted, {
        ...useImageStore.getState(),
        byInstance: {},
        unreadable: false,
      }) as ReturnType<typeof useImageStore.getState>;

    const stored = { ...base, mode: "multi" as const, items: [makeItem("a1")] };

    it("keeps the other widgets when one of them is unreadable", () => {
      const merged = mergeInto({ byInstance: { a: stored, b: "junk", c: stored } });
      expect(Object.keys(merged.byInstance)).toEqual(["a", "c"]);
    });

    it("keeps the uploaded images when one appearance setting is unreadable", () => {
      const merged = mergeInto({ byInstance: { a: { ...stored, fit: "nonsense" } } });

      expect(merged.byInstance["a"]?.fit).toBe("cover");
      expect(merged.byInstance["a"]?.items).toHaveLength(1);
    });

    it("drops only the unreadable image from the pool", () => {
      const merged = mergeInto({
        byInstance: { a: { ...stored, items: [makeItem("a1"), { assetId: 5 }] } },
      });

      expect(merged.byInstance["a"]?.items).toHaveLength(1);
    });

    it("caps an oversized pool on read instead of discarding the widget", () => {
      const many = Array.from({ length: MAX_MULTI_IMAGES + 2 }, (_, index) =>
        makeItem(`a${index}`),
      );
      const merged = mergeInto({ byInstance: { a: { ...stored, items: many } } });

      expect(merged.byInstance["a"]?.items).toHaveLength(MAX_MULTI_IMAGES);
    });

    it("refuses to overwrite data it cannot read at all", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const merged = mergeInto("not-an-object");

      expect(merged.unreadable).toBe(true);
      expect(merged.byInstance).toEqual({});
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it("clears the refusal once the data reads cleanly again", () => {
      expect(mergeInto({ byInstance: { a: stored } }).unreadable).toBe(false);
    });

    it("starts empty rather than throwing on a blob with no widgets at all", () => {
      expect(mergeInto({}).byInstance).toEqual({});
      expect(mergeInto({ byInstance: null }).byInstance).toEqual({});
      expect(mergeInto({ byInstance: [] }).byInstance).toEqual({});
    });
  });
});

describe("absent versus unreadable", () => {
  const merge = useImageStore.persist.getOptions().merge;
  const current = useImageStore.getState();

  it("treats nothing stored as a fresh start, not as data it must protect", () => {
    expect((merge?.(undefined, current) as { unreadable: boolean }).unreadable).toBe(false);
    expect((merge?.(null, current) as { unreadable: boolean }).unreadable).toBe(false);
  });

  it("still refuses to overwrite a value that is not a config at all", () => {
    expect((merge?.("corrupted", current) as { unreadable: boolean }).unreadable).toBe(true);
  });

  it("keeps a tolerated object rather than declaring it unreadable", () => {
    expect(
      (merge?.({ byInstance: "nonsense" }, current) as { unreadable: boolean }).unreadable,
    ).toBe(false);
  });
});
