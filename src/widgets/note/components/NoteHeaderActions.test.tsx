// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NoteHeaderActions } from "@/widgets/note/components/NoteHeaderActions";
import { NoteStatus } from "@/widgets/note/components/NoteStatus";
import { usePublishNoteDraft } from "@/widgets/note/hooks/useNoteDraft";
import { useNoteStore } from "@/widgets/note/useNoteStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";

const ID = "note-1";

function DraftPublisher({ id, text }: { id: string; text: string }) {
  usePublishNoteDraft(id, text);
  return null;
}

function draftHeader(id: string, text: string, publish = true) {
  return (
    <TooltipProvider>
      <WidgetInstanceContext.Provider value={id}>
        {publish && <DraftPublisher id={id} text={text} />}
        <NoteStatus />
        <NoteHeaderActions />
      </WidgetInstanceContext.Provider>
    </TooltipProvider>
  );
}

function renderActions() {
  return render(
    <TooltipProvider>
      <WidgetInstanceContext.Provider value={ID}>
        <NoteHeaderActions />
      </WidgetInstanceContext.Provider>
    </TooltipProvider>,
  );
}

function seed(text: string) {
  useNoteStore.setState({ byInstance: { [ID]: { text, fontSize: "base" } } });
}

function stubClipboard(writeText: () => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
}

beforeEach(() => {
  useNoteStore.setState({ byInstance: {} });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NoteHeaderActions", () => {
  it("copies and counts an uncommitted draft even when the saved note is empty", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    seed("");
    const source = "**Fresh** draft";
    render(draftHeader(ID, source));
    expect(screen.getByText("2 words · 15 chars")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Copy note"));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(source));
    expect(useNoteStore.getState().byInstance[ID]?.text).toBe("");
  });

  it("downloads visible raw source rather than a different remotely saved version", async () => {
    seed("Remote saved version");
    const source = "# My draft\n\n- [ ] Keep **source** intact";
    let fileName = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      fileName = this.download;
    });
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:draft");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    render(draftHeader(ID, source));
    fireEvent.click(screen.getByLabelText("Download note as a text file"));
    const blob = createObjectURL.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    const downloaded = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsText(blob as Blob);
    });
    expect(downloaded).toBe(source);
    expect(fileName).toMatch(/^[\w-]+\.txt$/);
    expect(useNoteStore.getState().byInstance[ID]?.text).toBe("Remote saved version");
  });

  it("keeps instance drafts independent and falls back to saved text after publisher cleanup", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    useNoteStore.setState({
      byInstance: {
        [ID]: { text: "Saved one", fontSize: "base" },
        other: { text: "Saved two", fontSize: "base" },
      },
    });
    const { rerender } = render(
      <>
        <section aria-label="First note">{draftHeader(ID, "Draft one")}</section>
        <section aria-label="Second note">{draftHeader("other", "Draft two")}</section>
      </>,
    );
    fireEvent.click(
      within(screen.getByRole("region", { name: "Second note" })).getByLabelText("Copy note"),
    );
    await waitFor(() => expect(writeText).toHaveBeenLastCalledWith("Draft two"));
    rerender(
      <>
        <section aria-label="First note">{draftHeader(ID, "Draft one", false)}</section>
        <section aria-label="Second note">{draftHeader("other", "Draft two")}</section>
      </>,
    );
    fireEvent.click(
      within(screen.getByRole("region", { name: "First note" })).getByLabelText("Copy note"),
    );
    await waitFor(() => expect(writeText).toHaveBeenLastCalledWith("Saved one"));
    fireEvent.click(
      within(screen.getByRole("region", { name: "Second note" })).getByLabelText("Copy note"),
    );
    await waitFor(() => expect(writeText).toHaveBeenLastCalledWith("Draft two"));
  });

  it("treats a live empty draft as empty instead of exposing the older saved text", () => {
    seed("Old saved text");
    render(draftHeader(ID, ""));
    expect(screen.queryByLabelText("Copy note")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Download note as a text file")).not.toBeInTheDocument();
    expect(screen.queryByText(/chars/)).not.toBeInTheDocument();
  });

  it("announces clipboard failure while preserving the note", async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error("clipboard denied")));
    seed("Keep me");
    renderActions();
    fireEvent.click(screen.getByLabelText("Copy note"));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Couldn’t copy note. Try again."),
    );
    expect(useNoteStore.getState().byInstance[ID]?.text).toBe("Keep me");
  });
  it("copies the note text to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    seed("remember the milk");
    renderActions();

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Copy note"));
    });

    expect(writeText).toHaveBeenCalledWith("remember the milk");
  });

  it("downloads the note as a named text file", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:note");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    seed("Shopping list for the weekend");
    renderActions();

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Download note as a text file"));
    });

    expect(click).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:note");
  });
});
