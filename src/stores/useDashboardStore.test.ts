// @vitest-environment jsdom
import { reconcilePersisted, useDashboardStore } from "@/stores/useDashboardStore";
import { WELCOME_SEEN_KEY } from "@/onboarding";
import { collides } from "@/widgets/core/layout-engine";

const store = () => useDashboardStore.getState();

describe("useDashboardStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useDashboardStore.setState({
      widgets: [],
      layout: [],
      columns: 12,
      editing: false,
      lastAddedId: null,
    });
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

    it("returns null when the persisted shape is not a dashboard", () => {
      expect(reconcilePersisted({ widgets: "nope" })).toBeNull();
    });
  });
});
