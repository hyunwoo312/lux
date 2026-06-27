import { useDashboardStore } from "@/stores/useDashboardStore";
import { collides } from "@/widgets/core/layout-engine";

const store = () => useDashboardStore.getState();

describe("useDashboardStore", () => {
  beforeEach(() => {
    useDashboardStore.setState({
      widgets: [],
      layout: [],
      savedLayouts: {},
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

  it("ignores a second instance of the same widget type", () => {
    store().addWidget("quickAccess");
    store().addWidget("quickAccess");

    expect(store().widgets).toHaveLength(1);
    expect(store().layout).toHaveLength(1);
  });

  it("places different widget types without overlapping", () => {
    store().addWidget("quickAccess");
    store().addWidget("tasks");

    const { layout } = store();
    expect(layout).toHaveLength(2);
    const [first, second] = layout;
    expect(first && second && collides(first, second)).toBe(false);
  });

  it("removes a widget and its layout item", () => {
    store().addWidget("quickAccess");
    const id = store().widgets[0]!.id;

    store().removeWidget(id);

    const { widgets, layout } = store();
    expect(widgets).toHaveLength(0);
    expect(layout).toHaveLength(0);
  });

  it("restores the previous position when a widget is re-added", () => {
    store().addWidget("quickAccess");
    const id = store().widgets[0]!.id;
    store().setLayout([{ i: id, x: 4, y: 6, w: 3, h: 3 }]);
    store().removeWidget(id);

    store().addWidget("quickAccess");

    expect(store().layout.find((item) => item.i === id)).toMatchObject({ x: 4, y: 6 });
  });

  it("toggles edit mode", () => {
    expect(store().editing).toBe(false);
    store().toggleEditing();
    expect(store().editing).toBe(true);
  });

  it("records the last added widget id, then clears it", () => {
    store().addWidget("note");
    expect(store().lastAddedId).toBe("note");

    store().clearLastAdded();
    expect(store().lastAddedId).toBeNull();
  });
});
