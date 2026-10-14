// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SettingsSearch } from "@/settings/components/SettingsSearch";
import { useSettingsStore } from "@/stores/useSettingsStore";

afterEach(cleanup);

describe("settings search", () => {
  it("autofocuses, opens an exact setting with Enter and retains its query", () => {
    useSettingsStore.getState().openSettings();
    useSettingsStore.getState().setSearchQuery("Grid lines");
    render(<SettingsSearch />);
    const input = screen.getByRole("searchbox");
    expect(input).toHaveFocus();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(useSettingsStore.getState().destination?.settingId).toBe(
      "settings.appearance.dashboard.gridLines",
    );
    expect(useSettingsStore.getState().searchQuery).toBe("Grid lines");
  });

  it("supports result traversal and clears the query before leaving search", () => {
    useSettingsStore.getState().openSettings();
    useSettingsStore.getState().setSearchQuery("Grid lines");
    render(<SettingsSearch />);
    const input = screen.getByRole("searchbox");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    const results = document.querySelectorAll("[data-settings-result]");
    expect(results[0]).toHaveFocus();
    const first = screen.getByRole("button", { name: /^Grid lines/ });
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(results[1]).toHaveFocus();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(useSettingsStore.getState().searchQuery).toBe("");
    expect(screen.getByRole("button", { name: "Appearance" })).toBeInTheDocument();
  });
});
