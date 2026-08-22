import { NOTE_MAX_LENGTH } from "@/widgets/note/types";
import { useNoteStore } from "@/widgets/note/useNoteStore";

const store = () => useNoteStore.getState();

describe("useNoteStore", () => {
  beforeEach(() => {
    useNoteStore.setState({ byInstance: {} });
  });

  it("replaces the note text for an instance", () => {
    store().setText("a", "first");
    store().setText("a", "second");

    expect(store().byInstance["a"]?.text).toBe("second");
  });

  it("sets the font size for an instance", () => {
    store().setFontSize("a", "lg");

    expect(store().byInstance["a"]?.fontSize).toBe("lg");
  });

  it("keeps instances independent", () => {
    store().setText("a", "alpha");
    store().setText("b", "beta");

    expect(store().byInstance["a"]?.text).toBe("alpha");
    expect(store().byInstance["b"]?.text).toBe("beta");
  });

  describe("migrate", () => {
    const migrate = useNoteStore.persist.getOptions().migrate;

    it("migrates legacy singleton data under the note instance key", () => {
      expect(migrate?.({ text: "hello", fontSize: "lg" }, 1)).toEqual({
        byInstance: { note: { text: "hello", fontSize: "lg" } },
      });
    });

    it("drops unrecognized legacy data", () => {
      expect(migrate?.({ bogus: true }, 1)).toEqual({ byInstance: {} });
    });

    it("passes current-version data through unchanged", () => {
      const persisted = { byInstance: { "note-1": { text: "kept", fontSize: "sm" } } };
      expect(migrate?.(persisted, 2)).toBe(persisted);
    });
  });
});

describe("notes that predate the length cap", () => {
  it("still loads a note longer than NOTE_MAX_LENGTH", () => {
    const oversized = "x".repeat(NOTE_MAX_LENGTH * 2);
    const merged = useNoteStore.persist
      .getOptions()
      .merge?.(
        { byInstance: { old: { text: oversized, fontSize: "base" } } },
        useNoteStore.getState(),
      ) as { byInstance?: Record<string, { text?: string }> } | undefined;

    expect(merged?.byInstance?.old?.text).toHaveLength(oversized.length);
  });

  it("migrates a v1 single-note payload without the retired legacy schema", () => {
    const migrated = useNoteStore.persist
      .getOptions()
      .migrate?.({ text: "hello", fontSize: "lg" }, 1) as {
      byInstance?: Record<string, { text?: string }>;
    };

    expect(migrated.byInstance?.note?.text).toBe("hello");
  });

  describe("merge tolerance", () => {
    const merge = useNoteStore.persist.getOptions().merge;
    const mergeInto = (persisted: unknown) =>
      merge?.(persisted, { ...useNoteStore.getState(), byInstance: {} }) as ReturnType<
        typeof useNoteStore.getState
      >;

    it("keeps the other notes when one of them is unreadable", () => {
      const merged = mergeInto({
        byInstance: { a: { text: "keep me", fontSize: "lg" }, b: 5 },
      });

      expect(Object.keys(merged.byInstance)).toEqual(["a"]);
      expect(merged.byInstance["a"]?.text).toBe("keep me");
    });

    it("keeps the note's text when only its font size is unreadable", () => {
      const merged = mergeInto({ byInstance: { a: { text: "keep me", fontSize: "huge" } } });

      expect(merged.byInstance["a"]?.text).toBe("keep me");
      expect(merged.byInstance["a"]?.fontSize).toBe("base");
    });

    it("keeps the note's text when the font size is missing entirely", () => {
      const merged = mergeInto({ byInstance: { a: { text: "keep me" } } });
      expect(merged.byInstance["a"]?.text).toBe("keep me");
    });

    it("starts empty rather than throwing on a blob with no notes at all", () => {
      expect(mergeInto({}).byInstance).toEqual({});
      expect(mergeInto({ byInstance: null }).byInstance).toEqual({});
    });
  });
});
