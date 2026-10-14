// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { resolveSettingDestination } from "@/settings/destination";
import type { SettingEntry } from "@/settings/searchIndex";

const entry: SettingEntry = {
  settingId: "speed",
  fallbackIds: ["style", "type"],
  hint: "Choose Aurora.",
  tab: "appearance",
  label: "Speed",
  section: "Wallpaper",
  description: "Pattern speed",
};

describe("settings destinations", () => {
  it("finds the exact row inside the selected panel", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<div data-setting-id="style"></div><div data-setting-id="speed"><button>Adjust</button></div>';
    const found = resolveSettingDestination(root, entry);
    expect(found?.target.dataset.settingId).toBe("speed");
    expect(found?.hint).toBeUndefined();
  });

  it("skips hidden, inert and disabled conditional controls without activating them", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<div data-setting-id="speed"><button disabled>Speed</button></div><div inert><div data-setting-id="style"></div></div><div data-setting-id="type"><button>Type</button></div>';
    const found = resolveSettingDestination(root, entry);
    expect(found?.target.dataset.settingId).toBe("type");
    expect(found?.hint).toBe("Choose Aurora.");
    root.querySelector('[data-setting-id="type"]')?.setAttribute("hidden", "");
    expect(resolveSettingDestination(root, entry)).toBeNull();
  });

  it("allows informational permission rows with no interactive control", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div data-setting-id="required">Required</div>';
    expect(
      resolveSettingDestination(root, { ...entry, settingId: "required", hint: undefined })?.target
        .textContent,
    ).toBe("Required");
  });
});
