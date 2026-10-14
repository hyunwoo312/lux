// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { useSettingsStore } from "@/stores/useSettingsStore";

const merge = useSettingsStore.persist.getOptions().merge;
beforeEach(() => useSettingsStore.getState().closeSettings());

describe("persisted settings tab", () => {
  it("sends a profile parked on a tab that no longer exists back to Appearance", () => {
    const merged = merge?.({ tab: "general" }, { ...useSettingsStore.getState() }) as ReturnType<
      typeof useSettingsStore.getState
    >;

    expect(merged.tab).toBe("appearance");
  });
});

describe("reopening settings after a permission reload", () => {
  it("returns to the tab you were on, and highlights the row only on Accounts", () => {
    useSettingsStore.setState({ open: false, tab: "palette", permissionHighlight: null });
    useSettingsStore.getState().reopenAfterReload("tabs");
    expect(useSettingsStore.getState()).toMatchObject({
      open: true,
      tab: "palette",
      permissionHighlight: null,
    });

    useSettingsStore.setState({ open: false, tab: "accounts" });
    useSettingsStore.getState().reopenAfterReload("tabs");
    expect(useSettingsStore.getState()).toMatchObject({
      tab: "accounts",
      permissionHighlight: "tabs",
    });
  });
});

describe("settings navigation context", () => {
  it("keeps the originating section when permission recovery opens Accounts", () => {
    useSettingsStore.getState().closeSettings();
    useSettingsStore.getState().openSettings("palette");
    useSettingsStore.getState().openPermissions("tabs");
    expect(useSettingsStore.getState()).toMatchObject({
      tab: "accounts",
      visitedTabs: ["palette", "accounts"],
      permissionHighlight: "tabs",
    });
  });
  it("keeps visited panels transient and clears the session when closed", () => {
    useSettingsStore.getState().openSettings("appearance");
    useSettingsStore.getState().setTab("shortcuts");
    useSettingsStore.getState().setTab("appearance");
    useSettingsStore.getState().openSearch();
    useSettingsStore.getState().setSearchQuery("speed");
    expect(useSettingsStore.getState().visitedTabs).toEqual(["appearance", "shortcuts"]);
    const persisted = useSettingsStore.persist
      .getOptions()
      .partialize?.(useSettingsStore.getState());
    expect(persisted).toEqual({
      tab: "appearance",
      sidebarCollapsed: useSettingsStore.getState().sidebarCollapsed,
    });
    useSettingsStore.getState().closeSettings();
    expect(useSettingsStore.getState()).toMatchObject({
      visitedTabs: [],
      searchQuery: "",
      searchOpen: false,
      destination: null,
    });
  });
});
