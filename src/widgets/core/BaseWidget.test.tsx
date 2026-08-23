// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BaseWidget } from "@/widgets/core/BaseWidget";

function editingWidget(onRemove: () => void, editing = true) {
  return (
    <TooltipProvider>
      <BaseWidget title="Notes" editing={editing} onRemove={onRemove}>
        <p>content</p>
      </BaseWidget>
    </TooltipProvider>
  );
}

describe("BaseWidget", () => {
  it("removes the widget on the first press, with no confirmation to clear", () => {
    const onRemove = vi.fn();
    render(editingWidget(onRemove));

    fireEvent.click(screen.getByRole("button", { name: "Remove Notes" }));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Remove Notes?")).not.toBeInTheDocument();
  });

  it("offers no remove control outside edit mode", () => {
    const onRemove = vi.fn();
    render(editingWidget(onRemove, false));

    expect(screen.queryByRole("button", { name: "Remove Notes" })).not.toBeInTheDocument();
    expect(onRemove).not.toHaveBeenCalled();
  });
});
