// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGlobalShortcuts } from "@/app/useGlobalShortcuts";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { useToastStore } from "@/stores/useToastStore";
import { useWidgetPaletteStore } from "@/stores/useWidgetPaletteStore";

function Host() {
  useGlobalShortcuts();
  return null;
}

function press(key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
  window.dispatchEvent(event);
  return event;
}

beforeEach(() => {
  render(<Host />);
  useDashboardStore.setState({ editing: false });
  useWidgetPaletteStore.setState({ open: false });
  useToastStore.setState({ toast: null });
});

afterEach(() => {
  document.body.style.pointerEvents = "";
});

describe("global shortcuts", () => {
  it("runs the bound action and claims the key", () => {
    const event = press("e", { ctrlKey: true });

    expect(useDashboardStore.getState().editing).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });

  it("stays out of the way while a modal layer is open", () => {
    document.body.style.pointerEvents = "none";

    press("e", { ctrlKey: true });

    expect(useDashboardStore.getState().editing).toBe(false);
  });

  it("stays out of the way while typing", () => {
    const input = document.createElement("input");
    document.body.append(input);

    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "e", ctrlKey: true, bubbles: true, cancelable: true }),
    );

    expect(useDashboardStore.getState().editing).toBe(false);
    input.remove();
  });

  it("reverses the removal the toast is offering", () => {
    const run = vi.fn();
    useToastStore.setState({
      toast: { key: "a", message: "Removed", action: { kind: "undo", run } },
    });

    press("z", { ctrlKey: true });

    expect(run).toHaveBeenCalledOnce();
  });

  it("leaves a toast that offers no reversal alone", () => {
    const run = vi.fn();
    useToastStore.setState({
      toast: { key: "a", message: "Hi", action: { kind: "action", label: "Reopen", run } },
    });

    press("z", { ctrlKey: true });

    expect(run).not.toHaveBeenCalled();
  });

  it("dismisses the toast before leaving edit mode", () => {
    useDashboardStore.setState({ editing: true });
    useToastStore.setState({ toast: { key: "a", message: "Removed" } });

    press("Escape");

    expect(useToastStore.getState().toast).toBeNull();
    expect(useDashboardStore.getState().editing).toBe(true);

    press("Escape");

    expect(useDashboardStore.getState().editing).toBe(false);
  });

  it("leaves Escape to the browser when nothing is dismissable", () => {
    const event = press("Escape");

    expect(event.defaultPrevented).toBe(false);
  });
});
