// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WidgetDragOverlay } from "@/app/WidgetDragOverlay";
import { useWidgetDragStore } from "@/widgets/core/useWidgetDragStore";

const morph = {
  type: "note" as const,
  from: { x: 0, y: 0, w: 200, h: 44 },
  to: { x: 100, y: 100, w: 300, h: 300 },
};

beforeEach(() => {
  vi.useFakeTimers();
  useWidgetDragStore.setState({ type: null, dropMorph: null, geometry: null });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("the drop ghost", () => {
  it("clears itself even when the animation never reports finishing", () => {
    render(<WidgetDragOverlay />);
    act(() => useWidgetDragStore.getState().drop(morph));

    expect(useWidgetDragStore.getState().dropMorph).not.toBeNull();

    act(() => vi.advanceTimersByTime(2000));

    expect(useWidgetDragStore.getState().dropMorph).toBeNull();
  });

  it("does not let a lingering ghost hide the next drag", () => {
    render(<WidgetDragOverlay />);
    act(() => useWidgetDragStore.getState().drop(morph));
    act(() => useWidgetDragStore.getState().start("note", 10, 10, 200, 44));

    expect(document.body.textContent).toContain("Note");
  });
});
