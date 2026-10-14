// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Dialog } from "@/components/ui/dialog";
import { SettingsSidebar } from "@/settings/components/SettingsSidebar";
import { useSettingsStore } from "@/stores/useSettingsStore";

afterEach(cleanup);
it("keeps compact search in the expanded sidebar and reaches its exact field", () => {
  useSettingsStore.getState().closeSettings();
  useSettingsStore.getState().openSettings("appearance");
  useSettingsStore.setState({ sidebarCollapsed: false });
  render(
    <Dialog>
      <TooltipProvider>
        <SettingsSidebar />
      </TooltipProvider>
    </Dialog>,
  );
  const input = screen.getByRole("searchbox", { name: "Search settings" });
  fireEvent.change(input, { target: { value: "Grid lines" } });
  expect(
    screen.queryByText("Always show the dashboard grid, not only while editing."),
  ).not.toBeInTheDocument();
  fireEvent.keyDown(input, { key: "Enter" });
  expect(useSettingsStore.getState().destination?.settingId).toBe(
    "settings.appearance.dashboard.gridLines",
  );
  expect(useSettingsStore.getState().searchQuery).toBe("");
});
