// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { NoteWidget } from "@/widgets/note/NoteWidget";
import { useNoteStore } from "@/widgets/note/useNoteStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { NOTE_MAX_LENGTH } from "@/widgets/note/types";
import { readNoteDraft, saveNoteDraft } from "@/widgets/note/lib/drafts";

const ID = "note-1";

function renderWidget({ justAdded = false } = {}) {
  return render(
    <WidgetInstanceContext.Provider value={ID}>
      <NoteWidget editing={false} justAdded={justAdded} />
    </WidgetInstanceContext.Provider>,
  );
}

function seedNote(id: string, text: string) {
  useNoteStore.setState({ byInstance: { [id]: { text, fontSize: "base" } } });
}

function storedText() {
  return useNoteStore.getState().byInstance[ID]?.text;
}

beforeEach(() => {
  vi.useFakeTimers();
  useNoteStore.setState({ byInstance: {} });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("NoteWidget", () => {
  it("previews the current conflicting draft and keeps explicit resolution reachable", () => {
    seedNote(ID, "saved");
    renderWidget();
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "# My draft" } });
    act(() => {
      useNoteStore.setState({
        byInstance: { [ID]: { text: "remote", fontSize: "base", updatedAt: Date.now() + 5 } },
      });
    });
    fireEvent.click(screen.getByRole("button", { name: "Read" }));
    expect(screen.getByRole("heading", { name: "My draft" })).toBeInTheDocument();
    expect(storedText()).toBe("remote");
    fireEvent.click(screen.getByRole("button", { name: "Use saved" }));
    expect(screen.getByRole("article")).toHaveTextContent("remote");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Note")).toHaveValue("remote");
  });

  it("keeps the same editor and selection through reading, without rewriting source", () => {
    seedNote(ID, "# Title\n\nhello");
    renderWidget();
    const field = screen.getByLabelText<HTMLTextAreaElement>("Note");
    field.setSelectionRange(10, 13);
    fireEvent.click(screen.getByRole("button", { name: "Read" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Note")).toBe(field);
    expect(field.selectionStart).toBe(10);
    expect(storedText()).toBe("# Title\n\nhello");
  });

  it("journals formatting and rejects an overflowing operation atomically", () => {
    seedNote(ID, "word");
    renderWidget();
    const field = screen.getByLabelText<HTMLTextAreaElement>("Note");
    field.setSelectionRange(0, 4);
    fireEvent.keyDown(field, { key: "b", ctrlKey: true });
    expect(field).toHaveValue("**word**");
    expect(readNoteDraft(ID)?.text).toBe("**word**");
    fireEvent.change(field, { target: { value: "x".repeat(NOTE_MAX_LENGTH) } });
    field.setSelectionRange(0, 1);
    fireEvent.keyDown(field, { key: "i", ctrlKey: true });
    expect(field.value.length).toBe(NOTE_MAX_LENGTH);
  });

  it("does not interpret composition or modified Enter as list continuation", () => {
    seedNote(ID, "- entry");
    renderWidget();
    const field = screen.getByLabelText<HTMLTextAreaElement>("Note");
    field.setSelectionRange(7, 7);
    fireEvent.keyDown(field, { key: "Enter", isComposing: true });
    fireEvent.keyDown(field, { key: "Enter", altKey: true });
    fireEvent.keyDown(field, { key: "Enter", ctrlKey: true });
    expect(field).toHaveValue("- entry");
  });

  it("journals the input synchronously before the store debounce", () => {
    renderWidget();
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "recover me" } });
    expect(storedText()).toBeUndefined();
    expect(readNoteDraft(ID)?.text).toBe("recover me");
  });

  it("recovers a draft on mount", () => {
    seedNote(ID, "saved");
    saveNoteDraft(ID, "saved tail", "saved", 0);
    renderWidget();
    expect(screen.getByLabelText("Note")).toHaveValue("saved tail");
    expect(storedText()).toBe("saved tail");
  });

  it("keeps a conflicting draft until the user chooses the saved version", () => {
    seedNote(ID, "newer edit");
    localStorage.setItem(
      `lux.note.draft.${ID}:closed-tab`,
      JSON.stringify({
        text: "my edits",
        baseText: "older edit",
        baseAt: 0,
        at: Date.now(),
        conflict: false,
      }),
    );
    const { unmount } = renderWidget();
    expect(screen.getByLabelText("Note")).toHaveValue("my edits");
    expect(screen.getByRole("status")).toHaveTextContent(/another tab/);
    vi.advanceTimersByTime(1000);
    expect(storedText()).toBe("newer edit");
    fireEvent.click(screen.getByRole("button", { name: "Use saved" }));
    expect(screen.getByLabelText("Note")).toHaveValue("newer edit");
    expect(readNoteDraft(ID)).toBeUndefined();
    unmount();
    renderWidget();
    expect(screen.queryByRole("button", { name: "Use saved" })).not.toBeInTheDocument();
  });

  it("allows keeping edits after a remote change while typing", () => {
    seedNote(ID, "saved");
    renderWidget();
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "my edits" } });
    act(() => {
      useNoteStore.setState({
        byInstance: { [ID]: { text: "remote edit", fontSize: "base", updatedAt: Date.now() + 5 } },
      });
    });
    vi.advanceTimersByTime(1000);
    expect(storedText()).toBe("remote edit");
    fireEvent.click(screen.getByRole("button", { name: "Keep mine" }));
    expect(storedText()).toBe("my edits");
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
    renderWidget({ justAdded: true });

    expect(screen.getByLabelText("Note")).toBe(document.activeElement);
  });
});

describe("length limit", () => {
  it("does not clip a note that was already longer than the cap", () => {
    const oversized = "y".repeat(NOTE_MAX_LENGTH * 2);
    seedNote("note-legacy", oversized);
    render(
      <WidgetInstanceContext.Provider value="note-legacy">
        <NoteWidget editing={false} justAdded={false} />
      </WidgetInstanceContext.Provider>,
    );
    expect(screen.getByLabelText("Note")).toHaveValue(oversized);
  });

  it("caps growth rather than length, so an oversized note survives a keystroke", () => {
    const oversized = "y".repeat(NOTE_MAX_LENGTH * 2);
    seedNote(ID, oversized);
    renderWidget();
    const field = screen.getByRole("textbox", { name: "Note" }) as HTMLTextAreaElement;

    fireEvent.change(field, { target: { value: `${oversized}z` } });

    expect(field.value).toHaveLength(NOTE_MAX_LENGTH * 2);
  });

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
