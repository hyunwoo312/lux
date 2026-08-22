// @vitest-environment jsdom
import { reconcilePersisted, UNDO_WINDOW_MS, useDashboardStore } from "@/stores/useDashboardStore";
import { WELCOME_SEEN_KEY } from "@/onboarding";
import { collides } from "@/widgets/core/layout-engine";
import { useWidgetSettingsStore } from "@/widgets/core/useWidgetSettingsStore";

const store = () => useDashboardStore.getState();

describe("useDashboardStore", () => {
  beforeEach(() => {
    useDashboardStore.setState({
      widgets: [],
      layout: [],
      columns: 12,
      editing: false,
      lastAddedId: null,
      pendingRemoval: null,
    });
    useWidgetSettingsStore.setState({ settings: {} });
  });

  it("adds a widget with a matching layout item", () => {
    store().addWidget("quickAccess");

    const { widgets, layout } = store();
    expect(widgets).toHaveLength(1);
    expect(widgets[0]?.type).toBe("quickAccess");
    expect(layout).toHaveLength(1);
    expect(layout[0]?.i).toBe(widgets[0]?.id);
  });

  it("allows multiple instances of a multi-instance widget type", () => {
    store().addWidget("note");
    store().addWidget("note");

    const { widgets, layout } = store();
    expect(widgets).toHaveLength(2);
    expect(widgets[0]?.id).not.toBe(widgets[1]?.id);
    expect(layout).toHaveLength(2);
  });

  it("places different widget types without overlapping", () => {
    store().addWidget("quickAccess");
    store().addWidget("tasks");

    const { layout } = store();
    expect(layout).toHaveLength(2);
    const [first, second] = layout;
    expect(first && second && collides(first, second)).toBe(false);
  });

  it("fills the row to the right before stacking below", () => {
    useDashboardStore.setState({ columns: 18 });
    store().addWidget("note");
    store().addWidget("note");
    store().addWidget("note");

    const rows = store().layout.map((item) => item.y);
    expect(rows).toEqual([0, 0, 0]);
    expect(store().layout.map((item) => item.x)).toEqual([0, 6, 12]);
  });

  it("removes a widget and its layout item", () => {
    store().addWidget("quickAccess");
    const id = store().widgets[0]!.id;

    store().removeWidget(id);

    const { widgets, layout } = store();
    expect(widgets).toHaveLength(0);
    expect(layout).toHaveLength(0);
  });

  it("toggles edit mode", () => {
    expect(store().editing).toBe(false);
    store().toggleEditing();
    expect(store().editing).toBe(true);
  });

  it("records the last added widget id, then clears it", () => {
    store().addWidget("quickAccess");
    expect(store().lastAddedId).toBe(store().widgets[0]?.id);

    store().clearLastAdded();
    expect(store().lastAddedId).toBeNull();
  });

  describe("seedStarterIfFirstRun", () => {
    it("seeds a starter board on a fresh, unseen install", () => {
      store().seedStarterIfFirstRun();

      const { widgets, layout } = store();
      expect(widgets.map((widget) => widget.type)).toEqual([
        "quickAccess",
        "weather",
        "tasks",
        "stocks",
      ]);
      expect(layout).toHaveLength(widgets.length);
      expect(layout.map((item) => item.i)).toEqual(widgets.map((widget) => widget.id));
    });

    it("seeds the starter widgets without overlap", () => {
      store().seedStarterIfFirstRun();

      const { layout } = store();
      for (let i = 0; i < layout.length; i += 1) {
        for (let j = i + 1; j < layout.length; j += 1) {
          const a = layout[i]!;
          const b = layout[j]!;
          expect(collides(a, b)).toBe(false);
        }
      }
    });

    it("does not seed once the welcome has been seen", () => {
      localStorage.setItem(WELCOME_SEEN_KEY, "1");

      store().seedStarterIfFirstRun();

      expect(store().widgets).toHaveLength(0);
    });

    it("does not seed over an existing board", () => {
      store().addWidget("note");
      store().seedStarterIfFirstRun();

      expect(store().widgets).toHaveLength(1);
    });
  });

  describe("removing a widget", () => {
    function addWidgetWithSettings() {
      store().addWidget("tasks");
      const id = store().widgets[0]?.id ?? "";
      useWidgetSettingsStore.getState().setBackground(id, "solid");
      return id;
    }

    it("takes the widget off the grid but keeps its content until the window closes", () => {
      const id = addWidgetWithSettings();

      store().removeWidget(id);

      expect(store().widgets).toHaveLength(0);
      expect(store().layout).toHaveLength(0);
      expect(useWidgetSettingsStore.getState().settings[id]?.background).toBe("solid");
    });

    it("brings the widget back with its content on undo", () => {
      const id = addWidgetWithSettings();
      store().removeWidget(id);

      store().undoRemove();

      expect(store().widgets.map((w) => w.id)).toEqual([id]);
      expect(store().layout.map((l) => l.i)).toEqual([id]);
      expect(useWidgetSettingsStore.getState().settings[id]?.background).toBe("solid");
    });

    it("drops the content once the undo window expires", () => {
      vi.useFakeTimers();
      const id = addWidgetWithSettings();
      store().removeWidget(id);

      vi.advanceTimersByTime(UNDO_WINDOW_MS);

      expect(store().pendingRemoval).toBeNull();
      expect(useWidgetSettingsStore.getState().settings[id]).toBeUndefined();
      vi.useRealTimers();
    });

    it("settles the previous removal when a second widget is removed", () => {
      const first = addWidgetWithSettings();
      store().addWidget("note");
      const second = store().widgets[1]?.id ?? "";

      store().removeWidget(first);
      store().removeWidget(second);

      expect(useWidgetSettingsStore.getState().settings[first]).toBeUndefined();
      expect(store().pendingRemoval?.instance.id).toBe(second);
    });

    it("puts the widget back exactly where it was when the space is still free", () => {
      store().addWidget("tasks");
      const id = store().widgets[0]?.id ?? "";
      const before = store().layout.find((l) => l.i === id);

      store().removeWidget(id);
      store().undoRemove();

      expect(store().layout.find((l) => l.i === id)).toEqual(before);
    });

    it("does not drop the widget back on top of something that moved in", () => {
      store().addWidget("tasks");
      store().addWidget("note");
      const [removed, other] = store().widgets.map((w) => w.id);
      const removedItem = store().layout.find((l) => l.i === removed);

      store().removeWidget(removed ?? "");
      store().setLayout(
        store().layout.map((l) =>
          l.i === other ? { ...l, x: removedItem?.x ?? 0, y: removedItem?.y ?? 0 } : l,
        ),
      );
      store().undoRemove();

      const restored = store().layout.find((l) => l.i === removed);
      const moved = store().layout.find((l) => l.i === other);
      expect(restored && moved && collides(restored, moved)).toBe(false);
    });

    it("prunes a removal left pending by a previous page on rehydrate", () => {
      const id = addWidgetWithSettings();
      store().removeWidget(id);

      const onRehydrate = useDashboardStore.persist.getOptions().onRehydrateStorage;
      onRehydrate?.(store())?.(store(), undefined);

      expect(store().pendingRemoval).toBeNull();
      expect(useWidgetSettingsStore.getState().settings[id]).toBeUndefined();
      const liveIds = new Set(store().widgets.map((w) => w.id));
      expect(store().layout.filter((l) => !liveIds.has(l.i))).toEqual([]);
    });
  });

  describe("pending removal survives a reload", () => {
    it("is written by partialize and read back by reconcilePersisted", () => {
      store().addWidget("tasks");
      const id = store().widgets[0]?.id ?? "";
      store().removeWidget(id);

      const partialize = useDashboardStore.persist.getOptions().partialize;
      const written = JSON.parse(JSON.stringify(partialize?.(store())));

      expect(reconcilePersisted(written)?.pendingRemoval?.instance.id).toBe(id);
    });

    it("tolerates a malformed pending removal rather than losing the dashboard", () => {
      const result = reconcilePersisted({
        widgets: [{ id: "a", type: "note" }],
        layout: [{ i: "a", x: 0, y: 0, w: 2, h: 2 }],
        pendingRemoval: "nonsense",
      });

      expect(result?.widgets).toHaveLength(1);
      expect(result?.pendingRemoval).toBeNull();
    });
  });

  describe("reconcilePersisted", () => {
    it("drops widgets of an unknown type instead of resetting the dashboard", () => {
      const result = reconcilePersisted({
        widgets: [
          { id: "note-1", type: "note" },
          { id: "clock-1", type: "clock" },
        ],
        layout: [
          { i: "note-1", x: 0, y: 0, w: 4, h: 4 },
          { i: "clock-1", x: 4, y: 0, w: 4, h: 4 },
        ],
      });

      expect(result?.widgets).toEqual([{ id: "note-1", type: "note" }]);
      expect(result?.layout.map((item) => item.i)).toEqual(["note-1"]);
    });

    it("returns null only when the blob is not an object at all", () => {
      expect(reconcilePersisted("nonsense")).toBeNull();
      expect(reconcilePersisted({ widgets: "nope" })).toEqual({
        widgets: [],
        layout: [],
        pendingRemoval: null,
      });
    });

    it("keeps every other widget when one layout entry is unreadable", () => {
      const result = reconcilePersisted({
        widgets: [
          { id: "note-1", type: "note" },
          { id: "tasks-1", type: "tasks" },
        ],
        layout: [
          { i: "note-1", x: 3, y: 2, w: 4, h: 4 },
          { i: "tasks-1", x: "four", y: 0, w: 4, h: 4 },
        ],
      });

      expect(result?.widgets.map((widget) => widget.id)).toEqual(["note-1", "tasks-1"]);
      expect(result?.layout.find((item) => item.i === "note-1")).toMatchObject({ x: 3, y: 2 });
    });

    it("re-places a widget whose layout entry was lost rather than hiding it", () => {
      const result = reconcilePersisted({
        widgets: [{ id: "note-1", type: "note" }],
        layout: [],
      });

      expect(result?.layout.map((item) => item.i)).toEqual(["note-1"]);
    });

    it("survives a blob with no layout at all", () => {
      const result = reconcilePersisted({ widgets: [{ id: "note-1", type: "note" }] });

      expect(result?.widgets).toHaveLength(1);
      expect(result?.layout).toHaveLength(1);
    });
  });
});
