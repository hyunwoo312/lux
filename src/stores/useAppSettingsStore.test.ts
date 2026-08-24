// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { widgetPlugins } from "@/widgets/registry";

const store = () => useAppSettingsStore.getState();
const merge = useAppSettingsStore.persist.getOptions().merge;
const mergeInto = (persisted: unknown) =>
  merge?.(persisted, { ...store() }) as ReturnType<typeof store>;

const tunable = () => widgetPlugins.filter((plugin) => plugin.refreshMs !== undefined);

beforeEach(() => {
  useAppSettingsStore.setState({ refreshCadence: "default", widgetRefresh: {} });
});

describe("refresh cadence", () => {
  it("writes the preset to every widget that can be tuned", () => {
    store().applyRefreshPreset(
      tunable().map((plugin) => plugin.type),
      "relaxed",
    );

    expect(store().refreshCadence).toBe("relaxed");
    for (const plugin of tunable()) expect(store().widgetRefresh[plugin.type]).toBe(2);
  });

  it("falls to Custom as soon as one widget is adjusted on its own", () => {
    store().applyRefreshPreset(["news", "weather"], "relaxed");
    store().setWidgetRefresh("news", 0.5);

    expect(store().refreshCadence).toBe("custom");
    expect(store().widgetRefresh["news"]).toBe(0.5);
    expect(store().widgetRefresh["weather"]).toBe(2);
  });

  it("leaves an untouched widget at its built-in rate", () => {
    store().setWidgetRefresh("news", 4);

    expect(store().widgetRefresh["weather"]).toBeUndefined();
  });

  it("only exposes widgets that declare a single stable cadence", () => {
    const names = tunable().map((plugin) => plugin.name);

    expect(names).toContain("News");
    expect(names).not.toContain("Calendar");
    expect(names).not.toContain("Sports");
    expect(names).not.toContain("Spotify");
  });
});

describe("persisted tolerance", () => {
  it("reads a profile written before per-widget refresh existed as Custom", () => {
    const merged = mergeInto({ clock24h: true });

    expect(merged.refreshCadence).toBe("custom");
    expect(merged.clock24h).toBe(true);
  });

  it("drops only the unreadable override, never the readable one beside it", () => {
    const merged = mergeInto({ widgetRefresh: { news: 4, weather: "often" } });

    expect(merged.widgetRefresh).toEqual({ news: 4 });
  });

  it("refuses an override outside the safe range in either direction", () => {
    expect(mergeInto({ widgetRefresh: { news: 9999 } }).widgetRefresh).toEqual({});
    expect(mergeInto({ widgetRefresh: { news: 0.01 } }).widgetRefresh).toEqual({});
  });

  it("keeps the one step faster than default that the UI offers", () => {
    expect(mergeInto({ widgetRefresh: { news: 0.5 } }).widgetRefresh).toEqual({ news: 0.5 });
  });
});
