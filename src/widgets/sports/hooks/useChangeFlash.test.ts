// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FLASH_MS, useChangeFlash } from "@/widgets/sports/hooks/useChangeFlash";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function renderFlash(value: number | string | null, active = true) {
  return renderHook(({ value, active }) => useChangeFlash(value, active), {
    initialProps: { value, active },
  });
}

describe("useChangeFlash", () => {
  it("does not flash the value it mounted with", () => {
    const { result } = renderFlash(3);
    expect(result.current).toBe(false);
  });

  it("flashes when the value changes and clears itself", () => {
    const { result, rerender } = renderFlash(3);

    rerender({ value: 4, active: true });
    expect(result.current).toBe(true);

    act(() => void vi.advanceTimersByTime(FLASH_MS - 1));
    expect(result.current).toBe(true);

    act(() => void vi.advanceTimersByTime(1));
    expect(result.current).toBe(false);
  });

  it("stays quiet while inactive, and does not flash the change it missed", () => {
    const { result, rerender } = renderFlash(3, false);

    rerender({ value: 4, active: false });
    expect(result.current).toBe(false);

    rerender({ value: 4, active: true });
    expect(result.current).toBe(false);
  });

  it("drops an in-flight flash when it goes inactive", () => {
    const { result, rerender } = renderFlash(3);

    rerender({ value: 4, active: true });
    expect(result.current).toBe(true);

    rerender({ value: 4, active: false });
    expect(result.current).toBe(false);
  });

  it("restarts the window when the value changes again mid-flash", () => {
    const { result, rerender } = renderFlash(0);

    rerender({ value: 1, active: true });
    act(() => void vi.advanceTimersByTime(FLASH_MS - 100));
    expect(result.current).toBe(true);

    rerender({ value: 2, active: true });
    act(() => void vi.advanceTimersByTime(FLASH_MS - 100));
    expect(result.current).toBe(true);

    act(() => void vi.advanceTimersByTime(100));
    expect(result.current).toBe(false);
  });

  it("treats a null value as a real transition", () => {
    const { result, rerender } = renderFlash(null);
    rerender({ value: 1, active: true });
    expect(result.current).toBe(true);
  });
});
