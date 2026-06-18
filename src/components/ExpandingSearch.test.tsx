import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ExpandingSearch } from "@/components/ExpandingSearch";

function setup(overrides: Partial<Parameters<typeof ExpandingSearch>[0]> = {}) {
  const props = {
    open: false,
    onOpenChange: vi.fn(),
    value: "",
    onValueChange: vi.fn(),
    ariaLabel: "Search",
    ...overrides,
  };
  render(<ExpandingSearch {...props} />);
  return props;
}

describe("ExpandingSearch", () => {
  it("opens when the collapsed trigger is clicked", () => {
    const props = setup({ open: false });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(props.onOpenChange).toHaveBeenCalledWith(true);
  });

  it("hides the input from assistive tech while collapsed", () => {
    setup({ open: false });
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("reports value changes while open", () => {
    const props = setup({ open: true });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "lon" } });
    expect(props.onValueChange).toHaveBeenCalledWith("lon");
  });

  it("closes on Escape", () => {
    const props = setup({ open: true });
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("clears the value before closing when there is text", () => {
    const props = setup({ open: true, value: "paris" });
    fireEvent.click(screen.getByRole("button", { name: "Close search" }));
    expect(props.onValueChange).toHaveBeenCalledWith("");
    expect(props.onOpenChange).not.toHaveBeenCalled();
  });

  it("closes when the close button is pressed with an empty value", () => {
    const props = setup({ open: true, value: "" });
    fireEvent.click(screen.getByRole("button", { name: "Close search" }));
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("exposes combobox semantics wired to the listbox", () => {
    setup({
      open: true,
      popupOpen: true,
      listboxId: "lb",
      activeDescendantId: "lb-opt-0",
    });
    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveAttribute("aria-controls", "lb");
    expect(input).toHaveAttribute("aria-activedescendant", "lb-opt-0");
  });
});
