// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { useSettingsStore } from "@/settings/useSettingsStore";

const merge = useSettingsStore.persist.getOptions().merge;

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
