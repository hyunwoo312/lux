// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useGlobalShortcuts } from "@/app/useGlobalShortcuts";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { useToastStore } from "@/stores/useToastStore";
import { useWidgetPaletteStore } from "@/stores/useWidgetPaletteStore";
import { useSettingsStore } from "@/settings";
import { useCommandPaletteStore } from "@/palette";

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
  useSettingsStore.setState({ open: false });
  useCommandPaletteStore.setState({ open: false });
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

  it("still runs non-dialog shortcuts while a modal layer is open", () => {
    document.body.style.pointerEvents = "none";

    press("e", { ctrlKey: true });

    expect(useDashboardStore.getState().editing).toBe(true);
  });

  it("runs shortcuts even while focus sits in a text field", () => {
    const input = document.createElement("input");
    document.body.append(input);

    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "e", ctrlKey: true, bubbles: true, cancelable: true }),
    );

    expect(useDashboardStore.getState().editing).toBe(true);
    input.remove();
  });

  it("closes the dialog its own shortcut opened", () => {
    press(",", { ctrlKey: true });
    expect(useSettingsStore.getState().open).toBe(true);

    document.body.style.pointerEvents = "none";
    press(",", { ctrlKey: true });

    expect(useSettingsStore.getState().open).toBe(false);
  });

  it("opens a dialog even while focus sits in a text field", () => {
    const input = document.createElement("input");
    document.body.append(input);

    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: ",", ctrlKey: true, bubbles: true, cancelable: true }),
    );

    expect(useSettingsStore.getState().open).toBe(true);
    input.remove();
  });

  it("swaps one dialog for another when a dialog shortcut fires over it", () => {
    press(",", { ctrlKey: true });
    expect(useSettingsStore.getState().open).toBe(true);

    document.body.style.pointerEvents = "none";
    press("a", { ctrlKey: true, shiftKey: true });

    expect(useSettingsStore.getState().open).toBe(false);
    expect(useWidgetPaletteStore.getState().open).toBe(true);
  });

  it("closes the command palette when another dialog's shortcut fires", () => {
    useCommandPaletteStore.setState({ open: true });
    document.body.style.pointerEvents = "none";

    press(",", { ctrlKey: true });

    expect(useCommandPaletteStore.getState().open).toBe(false);
    expect(useSettingsStore.getState().open).toBe(true);
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
