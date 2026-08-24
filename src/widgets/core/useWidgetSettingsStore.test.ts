// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { useWidgetSettingsStore, useWidgetBackground } from "@/widgets/core/useWidgetSettingsStore";
import { renderHook } from "@testing-library/react";

const store = () => useWidgetSettingsStore.getState();
const merge = useWidgetSettingsStore.persist.getOptions().merge;
const mergeInto = (persisted: unknown) =>
  merge?.(persisted, { ...store(), settings: {} }) as ReturnType<typeof store>;

beforeEach(() => {
  useWidgetSettingsStore.setState({ settings: {}, surfacePreference: "glass" });
});

describe("surface preference", () => {
  it("applies one surface to every widget on the dashboard", () => {
    store().setBackground("a", "glass");
    store().applyBackgroundToAll(["a", "b", "c"], "solid");

    expect(store().surfacePreference).toBe("solid");
    expect(store().settings["a"]?.background).toBe("solid");
    expect(store().settings["c"]?.background).toBe("solid");
  });

  it("falls to Custom as soon as one widget is changed on its own", () => {
    store().applyBackgroundToAll(["a", "b"], "solid");
    store().setBackground("b", "glass");

    expect(store().surfacePreference).toBe("custom");
    expect(store().settings["a"]?.background).toBe("solid");
  });

  it("gives a widget added later the preferred surface, not the built-in default", () => {
    store().applyBackgroundToAll(["a"], "solid");
    const { result } = renderHook(() => useWidgetBackground("added-later"));

    expect(result.current).toBe("solid");
  });

  it("leaves a widget on glass while the preference is Custom", () => {
    useWidgetSettingsStore.setState({ surfacePreference: "custom" });
    const { result } = renderHook(() => useWidgetBackground("untouched"));

    expect(result.current).toBe("glass");
  });
});

describe("persisted tolerance", () => {
  it("reads a profile written before the preference existed as Custom", () => {
    const merged = mergeInto({ settings: { a: { background: "solid" } } });

    expect(merged.surfacePreference).toBe("custom");
    expect(merged.settings["a"]?.background).toBe("solid");
  });

  it("keeps the other widgets when one entry is unreadable", () => {
    const merged = mergeInto({
      settings: { a: { background: "solid" }, b: 7 },
      surfacePreference: "solid",
    });

    expect(Object.keys(merged.settings)).toEqual(["a"]);
    expect(merged.surfacePreference).toBe("solid");
  });

  it("falls back rather than wiping when the preference itself is nonsense", () => {
    const merged = mergeInto({ settings: {}, surfacePreference: "frosted" });

    expect(merged.surfacePreference).toBe("custom");
  });
});
