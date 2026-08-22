// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { NoteWidget } from "@/widgets/note/NoteWidget";
import { useNoteStore } from "@/widgets/note/useNoteStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
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

describe("length limit", () => {
  it("says how much did not fit instead of silently dropping it", () => {
    renderWidget();
    const field = screen.getByRole("textbox", { name: "Note" });

    fireEvent.change(field, { target: { value: "x".repeat(NOTE_MAX_LENGTH + 25) } });

    expect(screen.getByRole("status")).toHaveTextContent(/25 characters didn.t fit/);
  });

  it("keeps exactly what fits", () => {
    renderWidget();
    const field = screen.getByRole("textbox", { name: "Note" });

    fireEvent.change(field, { target: { value: "x".repeat(NOTE_MAX_LENGTH + 25) } });

    expect((field as HTMLTextAreaElement).value).toHaveLength(NOTE_MAX_LENGTH);
  });

  it("no longer caps the field itself, which is what clipped paste silently", () => {
    renderWidget();
    expect(screen.getByRole("textbox", { name: "Note" })).not.toHaveAttribute("maxlength");
  });
});

describe("list continuation", () => {
  it("continues a bullet when Enter is pressed at the end of one", () => {
    renderWidget();
    const field = screen.getByRole("textbox", { name: "Note" }) as HTMLTextAreaElement;

    fireEvent.change(field, { target: { value: "- milk" } });
    field.setSelectionRange(6, 6);
    fireEvent.keyDown(field, { key: "Enter" });

    expect(field.value).toBe("- milk\n- ");
  });

  it("leaves Shift+Enter alone so a plain newline is still possible", () => {
    renderWidget();
    const field = screen.getByRole("textbox", { name: "Note" }) as HTMLTextAreaElement;

    fireEvent.change(field, { target: { value: "- milk" } });
    field.setSelectionRange(6, 6);
    fireEvent.keyDown(field, { key: "Enter", shiftKey: true });

    expect(field.value).toBe("- milk");
  });

  it("toggles a checkbox on the caret's line", () => {
    renderWidget();
    const field = screen.getByRole("textbox", { name: "Note" }) as HTMLTextAreaElement;

    fireEvent.change(field, { target: { value: "- [ ] buy milk" } });
    field.setSelectionRange(8, 8);
    fireEvent.keyDown(field, { key: "Enter", ctrlKey: true });

    expect(field.value).toBe("- [x] buy milk");
  });
});
