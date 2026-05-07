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
    });
  });

  it("adds a widget with a matching layout item", () => {
    store().addWidget("clock");

    const { widgets, layout } = store();
    expect(widgets).toHaveLength(1);
    expect(widgets[0]?.type).toBe("clock");
    expect(layout).toHaveLength(1);
    expect(layout[0]?.i).toBe(widgets[0]?.id);
  });

  it("ignores a second instance of the same widget type", () => {
    store().addWidget("clock");
    store().addWidget("clock");

    expect(store().widgets).toHaveLength(1);
    expect(store().layout).toHaveLength(1);
  });

  it("places different widget types without overlapping", () => {
    store().addWidget("clock");
    store().addWidget("tasks");

    const { layout } = store();
    expect(layout).toHaveLength(2);
    const [first, second] = layout;
    expect(first && second && collides(first, second)).toBe(false);
  });

  it("removes a widget and its layout item", () => {
    store().addWidget("clock");
    const id = store().widgets[0]!.id;

    store().removeWidget(id);

    const { widgets, layout } = store();
    expect(widgets).toHaveLength(0);
    expect(layout).toHaveLength(0);
  });

  it("restores the previous position when a widget is re-added", () => {
    store().addWidget("clock");
    const id = store().widgets[0]!.id;
    store().setLayout([{ i: id, x: 4, y: 6, w: 3, h: 3 }]);
    store().removeWidget(id);

    store().addWidget("clock");

    expect(store().layout.find((item) => item.i === id)).toMatchObject({ x: 4, y: 6 });
  });

  it("toggles edit mode", () => {
    expect(store().editing).toBe(false);
    store().toggleEditing();
    expect(store().editing).toBe(true);
  });
});
