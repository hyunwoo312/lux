// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BaseWidget } from "@/widgets/core/BaseWidget";

function editingWidget(onRemove: () => void, editing = true, removalNote?: () => string | null) {
  return (
    <TooltipProvider>
      <BaseWidget title="Notes" editing={editing} onRemove={onRemove} removalNote={removalNote}>
        <p>content</p>
      </BaseWidget>
    </TooltipProvider>
  );
}

describe("BaseWidget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const WARNING = "Your 3 tasks will be deleted.";
  const warns = () => WARNING;

  it("removes the widget only after confirming when content would be lost", () => {
    const onRemove = vi.fn();
    render(editingWidget(onRemove, true, warns));

    fireEvent.click(screen.getByRole("button", { name: "Remove Notes" }));
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.getByText("Remove Notes?")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Remove" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onRemove).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(400));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("does not remove the widget when the dialog is cancelled", () => {
    const onRemove = vi.fn();
    render(editingWidget(onRemove, true, warns));

    fireEvent.click(screen.getByRole("button", { name: "Remove Notes" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.queryByText("Remove Notes?")).not.toBeInTheDocument();
  });

  it("shows the widget's removal note in the dialog", () => {
    render(editingWidget(vi.fn(), true, warns));

    fireEvent.click(screen.getByRole("button", { name: "Remove Notes" }));

    expect(screen.getByText(WARNING)).toBeInTheDocument();
  });

  it("removes straight away when the widget has nothing to lose", () => {
    const onRemove = vi.fn();
    render(editingWidget(onRemove, true, () => null));

    fireEvent.click(screen.getByRole("button", { name: "Remove Notes" }));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Remove Notes?")).not.toBeInTheDocument();
  });

  it("removes straight away when the widget declares no note at all", () => {
    const onRemove = vi.fn();
    render(editingWidget(onRemove));

    fireEvent.click(screen.getByRole("button", { name: "Remove Notes" }));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("closes the removal dialog when leaving edit mode", () => {
    const onRemove = vi.fn();
    const { rerender } = render(editingWidget(onRemove, true, warns));

    fireEvent.click(screen.getByRole("button", { name: "Remove Notes" }));
    rerender(editingWidget(onRemove, false, warns));

    expect(screen.queryByText("Remove Notes?")).not.toBeInTheDocument();
    expect(onRemove).not.toHaveBeenCalled();
  });
});
