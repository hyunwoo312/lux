// @vitest-environment jsdom
import { act, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTransientScrollbar } from "@/hooks/useTransientScrollbar";

afterEach(() => vi.useRealTimers());

describe("transient scrollbars", () => {
  it("tracks nested and newly mounted scroll surfaces independently and hides after idle", () => {
    vi.useFakeTimers();
    const { unmount } = renderHook(() => useTransientScrollbar());
    const outer = document.createElement("div");
    const inner = document.createElement("div");
    outer.append(inner);
    document.body.append(outer);
    expect(inner.dataset.scrolling).toBeUndefined();
    fireEvent.scroll(inner);
    expect(inner.dataset.scrolling).toBe("true");
    expect(outer.dataset.scrolling).toBeUndefined();
    act(() => vi.advanceTimersByTime(500));
    fireEvent.scroll(outer);
    act(() => vi.advanceTimersByTime(200));
    expect(inner.dataset.scrolling).toBeUndefined();
    expect(outer.dataset.scrolling).toBe("true");
    fireEvent.scroll(inner);
    act(() => vi.advanceTimersByTime(500));
    expect(inner.dataset.scrolling).toBe("true");
    expect(outer.dataset.scrolling).toBeUndefined();
    act(() => vi.advanceTimersByTime(200));
    expect(inner.dataset.scrolling).toBeUndefined();
    expect(outer.dataset.scrolling).toBeUndefined();
    fireEvent.scroll(inner);
    unmount();
    expect(inner.dataset.scrolling).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.scroll(outer);
    expect(outer.dataset.scrolling).toBeUndefined();
    outer.remove();
  });
});
