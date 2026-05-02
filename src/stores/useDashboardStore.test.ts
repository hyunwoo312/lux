import { useDashboardStore } from "@/stores/useDashboardStore";

describe("useDashboardStore", () => {
  beforeEach(() => {
    useDashboardStore.setState({ widgets: [], layout: [], editing: false });
  });

  it("adds a widget with a matching layout item", () => {
    useDashboardStore.getState().addWidget("clock");

    const { widgets, layout } = useDashboardStore.getState();
    expect(widgets).toHaveLength(1);
    expect(widgets[0]?.type).toBe("clock");
    expect(layout).toHaveLength(1);
    expect(layout[0]?.i).toBe(widgets[0]?.id);
  });

  it("removes a widget and its layout item", () => {
    useDashboardStore.getState().addWidget("clock");
    const id = useDashboardStore.getState().widgets[0]!.id;

    useDashboardStore.getState().removeWidget(id);

    const { widgets, layout } = useDashboardStore.getState();
    expect(widgets).toHaveLength(0);
    expect(layout).toHaveLength(0);
  });

  it("stacks added widgets so they do not overlap", () => {
    useDashboardStore.getState().addWidget("clock");
    useDashboardStore.getState().addWidget("clock");

    const { layout } = useDashboardStore.getState();
    expect(layout).toHaveLength(2);
    expect(layout[1]!.y).toBeGreaterThanOrEqual(layout[0]!.y + layout[0]!.h);
  });

  it("toggles edit mode", () => {
    expect(useDashboardStore.getState().editing).toBe(false);
    useDashboardStore.getState().toggleEditing();
    expect(useDashboardStore.getState().editing).toBe(true);
  });
});
