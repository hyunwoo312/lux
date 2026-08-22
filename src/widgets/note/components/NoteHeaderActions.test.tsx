// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NoteHeaderActions } from "@/widgets/note/components/NoteHeaderActions";
import { useNoteStore } from "@/widgets/note/useNoteStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";

const ID = "note-1";

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

  it("survives a rejected clipboard write", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    stubClipboard(writeText);
    seed("remember the milk");
    renderActions();

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Copy note"));
    });

    expect(writeText).toHaveBeenCalled();
    expect(screen.getByLabelText("Copy note")).toBeInTheDocument();
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
