// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import { useScaledCadence, WidgetTypeContext } from "@/widgets/core/useWidgetRefreshScale";

function wrapper(type: string | null) {
  return ({ children }: { children: ReactNode }) => (
    <WidgetTypeContext.Provider value={type}>{children}</WidgetTypeContext.Provider>
  );
}

beforeEach(() => {
  useAppSettingsStore.setState({ widgetRefresh: {} });
});

describe("useScaledCadence", () => {
  it("stretches both the poll interval and the staleness window by the widget's setting", () => {
    useAppSettingsStore.setState({ widgetRefresh: { anilist: 4 } });

    const { result } = renderHook(() => useScaledCadence(60_000, 180_000), {
      wrapper: wrapper("anilist"),
    });

    expect(result.current).toEqual({ staleMs: 240_000, intervalMs: 240_000 });
  });

  it("scales the fallback staleness when a resource declares no interval of its own", () => {
    useAppSettingsStore.setState({ widgetRefresh: { anilist: 2 } });

    const { result } = renderHook(() => useScaledCadence(undefined, 180_000), {
      wrapper: wrapper("anilist"),
    });

    expect(result.current).toEqual({ staleMs: 360_000, intervalMs: undefined });
  });

  it("leaves a widget with no preference untouched", () => {
    const { result } = renderHook(() => useScaledCadence(60_000, 180_000), {
      wrapper: wrapper("news"),
    });

    expect(result.current).toEqual({ staleMs: 60_000, intervalMs: 60_000 });
  });

  it("keeps a stable object so a subscribing effect does not re-run every render", () => {
    const { result, rerender } = renderHook(() => useScaledCadence(60_000, 180_000), {
      wrapper: wrapper("anilist"),
    });
    const first = result.current;
    rerender();

    expect(result.current).toBe(first);
  });
});
