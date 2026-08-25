// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/Toaster";
import { TOAST_DURATION_MS, useToastStore } from "@/stores/useToastStore";

beforeEach(() => {
  useToastStore.setState({ toast: null });
});

describe("Toaster", () => {
  it("stays out of the way when nothing has happened", () => {
    render(<Toaster />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("announces the message and its note without trapping focus", () => {
    render(<Toaster />);

    act(() => {
      useToastStore.getState().show({ key: "a", message: "Tasks removed", note: "kept locally" });
    });

    expect(screen.getByRole("status")).toHaveTextContent("Tasks removed");
    expect(screen.getByRole("status")).toHaveTextContent("kept locally");
    expect(document.activeElement).toBe(document.body);
  });

  it("runs the action instead of expiring when it is taken", () => {
    const run = vi.fn();
    const onExpire = vi.fn();
    render(<Toaster />);

    act(() => {
      useToastStore
        .getState()
        .show({ key: "a", message: "Removed", onExpire, action: { kind: "undo", run } });
    });
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(run).toHaveBeenCalledOnce();
    expect(onExpire).not.toHaveBeenCalled();
  });

  it("expires when dismissed", () => {
    const onExpire = vi.fn();
    render(<Toaster />);

    act(() => {
      useToastStore.getState().show({ key: "a", message: "Removed", onExpire });
    });
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(onExpire).toHaveBeenCalledOnce();
    expect(useToastStore.getState().toast).toBeNull();
  });

  it("expires on its own once the window closes", () => {
    vi.useFakeTimers();
    const onExpire = vi.fn();
    render(<Toaster />);

    act(() => {
      useToastStore.getState().show({ key: "a", message: "Removed", onExpire });
    });
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS);
    });

    expect(onExpire).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("settles the one it replaces", () => {
    const onExpire = vi.fn();
    render(<Toaster />);

    act(() => {
      useToastStore.getState().show({ key: "a", message: "First", onExpire });
      useToastStore.getState().show({ key: "b", message: "Second" });
    });

    expect(onExpire).toHaveBeenCalledOnce();
    expect(useToastStore.getState().toast?.key).toBe("b");
  });
});
