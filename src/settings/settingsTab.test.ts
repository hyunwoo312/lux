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
