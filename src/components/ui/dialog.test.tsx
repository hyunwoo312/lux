// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function overlay() {
  const node = document.querySelector('[data-slot="dialog-overlay"]');
  if (!node) throw new Error("no overlay");
  return node;
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

function clickOutside(node: Element) {
  fireEvent.pointerDown(node);
  fireEvent.click(node);
}

function renderDialog(onOpenChange: (open: boolean) => void, dismissOnClickOutside = true) {
  render(
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent dismissOnClickOutside={dismissOnClickOutside}>
        <DialogTitle>Title</DialogTitle>
        <DialogDescription>Description</DialogDescription>
        <Select>
          <SelectTrigger aria-label="Pick one">
            <SelectValue placeholder="Pick one" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">A</SelectItem>
          </SelectContent>
        </Select>
      </DialogContent>
    </Dialog>,
  );
}

describe("DialogContent", () => {
  it("closes when a click lands on the overlay outside it", async () => {
    const onOpenChange = vi.fn();
    renderDialog(onOpenChange);
    await settle();

    clickOutside(overlay());

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("stays open on an outside click when the caller opts out", async () => {
    const onOpenChange = vi.fn();
    renderDialog(onOpenChange, false);
    await settle();

    clickOutside(overlay());

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("survives the stray overlay click a closing dropdown leaves behind", async () => {
    const onOpenChange = vi.fn();
    renderDialog(onOpenChange);
    await settle();

    fireEvent.click(screen.getByRole("combobox", { name: "Pick one" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    clickOutside(overlay());

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});

describe("DialogContent keyboard", () => {
  it("lets a search field clear on Escape before the dialog closes", async () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <input type="search" aria-label="Find" defaultValue="paris" />
        </DialogContent>
      </Dialog>,
    );
    const field = screen.getByRole("searchbox", { name: "Find" });
    field.focus();

    fireEvent.keyDown(field, { key: "Escape" });
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.change(field, { target: { value: "" } });
    fireEvent.keyDown(field, { key: "Escape" });
    await settle();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("takes focus itself when asked, so the keyboard is inside the dialog", async () => {
    render(
      <Dialog open onOpenChange={vi.fn()}>
        <DialogContent initialFocus="container">
          <DialogTitle>Title</DialogTitle>
          <button type="button">First</button>
        </DialogContent>
      </Dialog>,
    );
    await settle();

    expect(document.activeElement).toBe(screen.getByRole("dialog"));
  });
});
