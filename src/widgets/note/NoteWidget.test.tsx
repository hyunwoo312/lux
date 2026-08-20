// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { NoteWidget } from "@/widgets/note/NoteWidget";
import { useNoteStore } from "@/widgets/note/useNoteStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { NoteStatus } from "@/widgets/note/components/NoteStatus";
import { NOTE_MAX_LENGTH } from "@/widgets/note/types";

const ID = "note-1";

function renderWidget() {
  return render(
    <WidgetInstanceContext.Provider value={ID}>
      <NoteWidget />
    </WidgetInstanceContext.Provider>,
  );
}

function seedNote(id: string, text: string) {
  useNoteStore.setState({ byInstance: { [id]: { text, fontSize: "base" } } });
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

describe("the length cap", () => {
  beforeEach(() => {
    useNoteStore.setState({ byInstance: {} });
  });

  it("states the limit in the header instead of showing a bare number", () => {
    seedNote("note-cap", "x".repeat(NOTE_MAX_LENGTH));
    render(
      <WidgetInstanceContext.Provider value="note-cap">
        <NoteStatus />
      </WidgetInstanceContext.Provider>,
    );
    expect(screen.getByText(/limit reached/)).toBeInTheDocument();
  });

  it("shows the remaining budget as the note approaches the cap", () => {
    seedNote("note-near", "x".repeat(Math.ceil(NOTE_MAX_LENGTH * 0.95)));
    render(
      <WidgetInstanceContext.Provider value="note-near">
        <NoteStatus />
      </WidgetInstanceContext.Provider>,
    );
    expect(screen.getByText(new RegExp(`/ ${NOTE_MAX_LENGTH} chars`))).toBeInTheDocument();
  });

  it("does not clip a note that was already longer than the cap", () => {
    const oversized = "y".repeat(NOTE_MAX_LENGTH * 2);
    seedNote("note-legacy", oversized);
    render(
      <WidgetInstanceContext.Provider value="note-legacy">
        <NoteWidget />
      </WidgetInstanceContext.Provider>,
    );
    expect(screen.getByLabelText("Note")).toHaveValue(oversized);
  });
});
