import { useDashboardStore } from "@/stores/useDashboardStore";
import { collides } from "@/widgets/core/layout-engine";

const store = () => useDashboardStore.getState();

describe("useDashboardStore", () => {
  beforeEach(() => {
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
});
