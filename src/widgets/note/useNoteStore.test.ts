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
});
