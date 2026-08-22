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

describe('ConfigSegmented fit="line"', () => {
  const OPTIONS = [
    { value: "all", label: "All" },
    { value: "reviews", label: "Pull requests" },
    { value: "issues", label: "Issues" },
    { value: "notifications", label: "Notifications" },
  ];

  function renderLine(value = "reviews") {
    return render(
      <ConfigSegmented
        fit="line"
        label="Filter"
        value={value}
        options={OPTIONS}
        onChange={() => {}}
      />,
    );
  }

  it("never wraps to a second row", () => {
    renderLine();
    expect(screen.getByRole("radiogroup", { name: "Filter" })).toHaveClass("flex-nowrap");
  });

  it("keeps the chosen option at full width while the rest give way", () => {
    renderLine();
    expect(screen.getByRole("radio", { name: "Pull requests" })).toHaveClass("shrink-0");
    expect(screen.getByRole("radio", { name: "All" })).toHaveClass("flex-1");
  });

  it("truncates only the options that gave way", () => {
    renderLine();
    expect(screen.getByText("Issues")).toHaveClass("truncate");
    expect(screen.getByText("Pull requests")).not.toHaveClass("truncate");
  });

  it("still wraps by default, so every other widget is untouched", () => {
    render(<ConfigSegmented label="Filter" value="all" options={OPTIONS} onChange={() => {}} />);
    expect(screen.getByRole("radiogroup", { name: "Filter" })).toHaveClass("flex-wrap");
  });
});
