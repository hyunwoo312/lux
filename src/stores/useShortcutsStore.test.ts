// @vitest-environment jsdom
import { SHORTCUT_DEFAULTS, useShortcutsStore } from "@/stores/useShortcutsStore";
import type { Shortcut } from "@/lib/shortcuts";

const store = () => useShortcutsStore.getState();

const openSettings: Shortcut = { mod: true, shift: false, alt: false, key: "," };
const other: Shortcut = { mod: true, shift: true, alt: false, key: "k" };

describe("useShortcutsStore", () => {
  beforeEach(() => {
    store().resetAll();
  });

  it("records a second binding in the free slot", () => {
    store().setShortcutSlot("openSettings", 0, openSettings);
    store().setShortcutSlot("openSettings", 1, other);

    expect(store().openSettings).toEqual([openSettings, other]);
  });

  it("does not record the same binding into both slots of one action", () => {
    store().setShortcutSlot("openSettings", 0, openSettings);
    store().setShortcutSlot("openSettings", 1, openSettings);

    expect(store().openSettings).toEqual([openSettings]);
  });

  it("replaces a slot with a binding it already holds without dropping it", () => {
    store().setShortcutSlot("openSettings", 0, openSettings);
    store().setShortcutSlot("openSettings", 0, openSettings);

    expect(store().openSettings).toEqual([openSettings]);
  });

  it("resets one action back to its defaults", () => {
    store().setShortcutSlot("openSettings", 0, other);
    store().resetShortcut("openSettings");

    expect(store().openSettings).toEqual(SHORTCUT_DEFAULTS.openSettings);
  });
});

describe("persisted tolerance", () => {
  const merge = useShortcutsStore.persist.getOptions().merge;
  const mergeInto = (persisted: unknown) =>
    merge?.(persisted, { ...useShortcutsStore.getState() }) as Record<string, Shortcut[]>;
  const custom: Shortcut = { mod: true, shift: false, alt: false, key: "k" };

  it("keeps every other rebind when one action's bindings are corrupt", () => {
    const merged = mergeInto({
      openSettings: [custom],
      toggleTheme: [{ mod: "yes", shift: false, alt: false, key: "t" }],
    });

    expect(merged["openSettings"]).toEqual([custom]);
    expect(merged["toggleTheme"]).toEqual(SHORTCUT_DEFAULTS.toggleTheme);
  });

  it("drops only the unreadable binding, never the readable one beside it", () => {
    const merged = mergeInto({ openSettings: [custom, { key: 5 }] });

    expect(merged["openSettings"]).toEqual([custom]);
  });

  it("gives an action added after the profile was written its default", () => {
    const merged = mergeInto({ openSettings: [custom] });

    expect(merged["toggleTheme"]).toEqual(SHORTCUT_DEFAULTS.toggleTheme);
  });

  it("respects an action the user deliberately cleared", () => {
    const merged = mergeInto({ openSettings: [] });

    expect(merged["openSettings"]).toEqual([]);
  });
});
