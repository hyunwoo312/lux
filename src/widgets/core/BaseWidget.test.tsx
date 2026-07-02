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
  it("removes the widget only after a confirming second click", () => {
    const onRemove = vi.fn();
    render(editingWidget(onRemove));

    fireEvent.click(screen.getByRole("button", { name: "Remove Notes" }));
    expect(onRemove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirm remove Notes" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("disarms the remove confirmation when leaving edit mode", () => {
    const onRemove = vi.fn();
    const { rerender } = render(editingWidget(onRemove));

    fireEvent.click(screen.getByRole("button", { name: "Remove Notes" }));
    rerender(editingWidget(onRemove, false));
    rerender(editingWidget(onRemove));

    fireEvent.click(screen.getByRole("button", { name: "Remove Notes" }));
    expect(onRemove).not.toHaveBeenCalled();
  });
});