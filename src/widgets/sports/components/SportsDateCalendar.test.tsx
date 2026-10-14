// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SportsDateCalendar } from "@/widgets/sports/components/SportsDateCalendar";

describe("Sports date calendar", () => {
  it("selects an allowed day and disables dates outside the requested bounds", () => {
    const onSelect = vi.fn();
    render(
      <SportsDateCalendar
        date={new Date(2026, 9, 14, 12)}
        today="2026-10-14"
        min="2026-10-07"
        max="2026-10-21"
        onSelect={onSelect}
      />,
    );
    expect(screen.getByRole("button", { name: "Wednesday, October 14, 2026" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Tuesday, October 6, 2026" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Thursday, October 22, 2026" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Thursday, October 15, 2026" }));
    expect(onSelect).toHaveBeenCalledWith("2026-10-15");
  });

  it("moves keyboard focus across a year boundary and clamps to the earliest allowed day", () => {
    render(
      <SportsDateCalendar
        date={new Date(2027, 0, 1, 12)}
        today="2027-01-01"
        min="2026-12-25"
        max="2027-01-08"
        onSelect={vi.fn()}
      />,
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Friday, January 1, 2027" }), {
      key: "ArrowLeft",
    });
    expect(screen.getByRole("grid", { name: "December 2026" })).toBeInTheDocument();
    const previous = screen.getByRole("button", { name: "Thursday, December 31, 2026" });
    expect(previous).toHaveFocus();
    fireEvent.keyDown(previous, { key: "ArrowUp" });
    const minimum = screen.getByRole("button", { name: "Friday, December 25, 2026" });
    expect(minimum).toHaveFocus();
    fireEvent.keyDown(minimum, { key: "ArrowLeft" });
    expect(minimum).toHaveFocus();
  });
});
