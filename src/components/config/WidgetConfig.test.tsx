// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ConfigSegmented } from "@/components/config/WidgetConfig";

const OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function renderSegmented(onChange: (value: string, origin?: { x: number; y: number }) => void) {
  render(<ConfigSegmented label="Theme" value="light" options={OPTIONS} onChange={onChange} />);
  return screen.getByRole("radio", { name: "Dark" });
}

describe("ConfigSegmented", () => {
  it("reports the chosen option", () => {
    const onChange = vi.fn();
    fireEvent.click(renderSegmented(onChange));
    expect(onChange).toHaveBeenCalledWith("dark", expect.anything());
  });

  it("reports where the option was clicked so a transition can start there", () => {
    const onChange = vi.fn();
    fireEvent.click(renderSegmented(onChange));
    expect(onChange.mock.calls[0]?.[1]).toEqual({ x: expect.any(Number), y: expect.any(Number) });
  });
});
