// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Compass, Star } from "lucide-react";
import { WidgetTabs } from "@/widgets/core/WidgetTabs";

const TABS = [
  { value: "discover", label: "Discover", icon: Compass },
  { value: "favorites", label: "Favorites", icon: Star },
];

function renderTabs(value: "discover" | "favorites", onSelect = vi.fn()) {
  render(<WidgetTabs tabs={TABS} value={value} onSelect={onSelect} />);
  return onSelect;
}

describe("WidgetTabs keyboard model", () => {
  it("keeps only the selected tab in the tab order, so a widget costs one stop not many", () => {
    renderTabs("discover");

    expect(screen.getByRole("tab", { name: "Discover" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Favorites" })).toHaveAttribute("tabindex", "-1");
  });

  it("moves to the next tab on ArrowRight", () => {
    const onSelect = renderTabs("discover");

    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });

    expect(onSelect).toHaveBeenCalledWith("favorites");
  });

  it("wraps from the last tab back to the first", () => {
    const onSelect = renderTabs("favorites");

    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });

    expect(onSelect).toHaveBeenCalledWith("discover");
  });

  it("wraps backwards from the first tab to the last", () => {
    const onSelect = renderTabs("discover");

    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowLeft" });

    expect(onSelect).toHaveBeenCalledWith("favorites");
  });

  it("jumps to the ends with Home and End", () => {
    const onSelect = renderTabs("favorites");

    fireEvent.keyDown(screen.getByRole("tablist"), { key: "Home" });
    expect(onSelect).toHaveBeenCalledWith("discover");

    fireEvent.keyDown(screen.getByRole("tablist"), { key: "End" });
    expect(onSelect).toHaveBeenCalledWith("favorites");
  });

  it("leaves other keys to the widget beneath it", () => {
    const onSelect = renderTabs("discover");

    fireEvent.keyDown(screen.getByRole("tablist"), { key: "Escape" });

    expect(onSelect).not.toHaveBeenCalled();
  });
});
