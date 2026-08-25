// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/app/Header";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";

function renderHeader() {
  render(
    <TooltipProvider>
      <Header />
    </TooltipProvider>,
  );
  return screen.getByRole("toolbar", { name: "Dashboard actions" });
}

beforeEach(() => {
  useAppSettingsStore.setState({ showClock: true, clockDate: "off", clock24h: false });
});

describe("the header toolbar", () => {
  it("costs one tab stop, not one per button", () => {
    const toolbar = renderHeader();
    const buttons = [...toolbar.querySelectorAll("button")];

    expect(buttons.length).toBeGreaterThan(1);
    expect(buttons.filter((button) => button.tabIndex === 0)).toHaveLength(1);
  });

  it("moves along the toolbar with the arrow keys, wrapping at either end", () => {
    const toolbar = renderHeader();
    const buttons = [...toolbar.querySelectorAll("button")];
    buttons[0]?.focus();

    fireEvent.keyDown(toolbar, { key: "ArrowRight" });
    expect(document.activeElement).toBe(buttons[1]);

    fireEvent.keyDown(toolbar, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(buttons[0]);

    fireEvent.keyDown(toolbar, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
  });

  it("jumps to either end with Home and End", () => {
    const toolbar = renderHeader();
    const buttons = [...toolbar.querySelectorAll("button")];

    fireEvent.keyDown(toolbar, { key: "End" });
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);

    fireEvent.keyDown(toolbar, { key: "Home" });
    expect(document.activeElement).toBe(buttons[0]);
  });
});

describe("the header clock", () => {
  it("can be turned off entirely", () => {
    useAppSettingsStore.setState({ showClock: false });
    renderHeader();

    expect(screen.queryByText(":")).not.toBeInTheDocument();
  });

  it("shows no date line until one is asked for", () => {
    const weekday = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(new Date());
    renderHeader();

    expect(screen.queryByText(weekday)).not.toBeInTheDocument();
  });

  it("adds the year only for the fullest format", () => {
    const year = String(new Date().getFullYear());

    useAppSettingsStore.setState({ clockDate: "weekdayDate" });
    const { unmount } = render(
      <TooltipProvider>
        <Header />
      </TooltipProvider>,
    );
    expect(screen.queryByText((text) => text.includes(year))).not.toBeInTheDocument();
    unmount();

    useAppSettingsStore.setState({ clockDate: "full" });
    renderHeader();
    expect(screen.getByText((text) => text.includes(year))).toBeInTheDocument();
  });
});
