// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { NoteWidget } from "@/widgets/note/NoteWidget";
import { useNoteStore } from "@/widgets/note/useNoteStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";

const ID = "note-1";

function renderWidget() {
  return render(
    <WidgetInstanceContext.Provider value={ID}>
      <NoteWidget />
    </WidgetInstanceContext.Provider>,
  );
}

function storedText() {
  return useNoteStore.getState().byInstance[ID]?.text;
}

describe("NoteWidget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useNoteStore.setState({ byInstance: {} });
    useDashboardStore.setState({ lastAddedId: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not commit to the store until the debounce elapses", () => {
    renderWidget();
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "draft" } });

    expect(storedText()).toBeUndefined();

    vi.advanceTimersByTime(400);
    expect(storedText()).toBe("draft");
  });

  it("flushes pending text immediately on blur", () => {
    renderWidget();
    const textarea = screen.getByLabelText("Note");
    fireEvent.change(textarea, { target: { value: "on blur" } });
    fireEvent.blur(textarea);

    expect(storedText()).toBe("on blur");
  });

  it("flushes pending text on unmount", () => {
    const { unmount } = renderWidget();
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "on unmount" } });
    unmount();

    expect(storedText()).toBe("on unmount");
  });

  it("focuses the textarea when it is the freshly added widget", () => {
    useDashboardStore.setState({ lastAddedId: ID });
    renderWidget();

    expect(screen.getByLabelText("Note")).toBe(document.activeElement);
    expect(useDashboardStore.getState().lastAddedId).toBeNull();
  });
});
