// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BaseWidget } from "@/widgets/core/BaseWidget";

function editingWidget(
  onRemove: () => void,
  editing = true,
  removalNote?: () => string | null,
) {
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

  it("removes the widget only after confirming in the dialog", () => {
    const onRemove = vi.fn();
    render(editingWidget(onRemove));

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
    render(editingWidget(onRemove));

    fireEvent.click(screen.getByRole("button", { name: "Remove Notes" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.queryByText("Remove Notes?")).not.toBeInTheDocument();
  });

  it("shows the widget's removal note in the dialog", () => {
    render(editingWidget(vi.fn(), true, () => "Your 3 tasks will be deleted."));

    fireEvent.click(screen.getByRole("button", { name: "Remove Notes" }));

    expect(screen.getByText("Your 3 tasks will be deleted.")).toBeInTheDocument();
  });

  it("falls back to the generic removal note", () => {
    render(editingWidget(vi.fn(), true, () => null));

    fireEvent.click(screen.getByRole("button", { name: "Remove Notes" }));

    expect(
      screen.getByText("Its settings will be reset — you can add it back anytime."),
    ).toBeInTheDocument();
  });

  it("closes the removal dialog when leaving edit mode", () => {
    const onRemove = vi.fn();
    const { rerender } = render(editingWidget(onRemove));

    fireEvent.click(screen.getByRole("button", { name: "Remove Notes" }));
    rerender(editingWidget(onRemove, false));

    expect(screen.queryByText("Remove Notes?")).not.toBeInTheDocument();
    expect(onRemove).not.toHaveBeenCalled();
  });
});
