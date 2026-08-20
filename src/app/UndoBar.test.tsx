// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { UndoBar } from "@/app/UndoBar";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { useWidgetSettingsStore } from "@/widgets/core/useWidgetSettingsStore";

const store = () => useDashboardStore.getState();

function removeAWidget(): string {
  store().addWidget("tasks");
  const id = store().widgets[0]?.id ?? "";
  useWidgetSettingsStore.getState().setBackground(id, "solid");
  store().removeWidget(id);
  return id;
}

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

describe("UndoBar", () => {
  it("stays out of the way when nothing was removed", () => {
    render(<UndoBar />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("names the widget that was removed", () => {
    removeAWidget();
    render(<UndoBar />);

    expect(screen.getByRole("status")).toHaveTextContent("Tasks removed");
  });

  it("puts the widget back when undo is pressed", () => {
    const id = removeAWidget();
    render(<UndoBar />);

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(store().widgets.map((w) => w.id)).toEqual([id]);
    expect(useWidgetSettingsStore.getState().settings[id]?.background).toBe("solid");
  });

  it("settles the removal immediately when dismissed", () => {
    const id = removeAWidget();
    render(<UndoBar />);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(store().pendingRemoval).toBeNull();
    expect(useWidgetSettingsStore.getState().settings[id]).toBeUndefined();
  });
});
