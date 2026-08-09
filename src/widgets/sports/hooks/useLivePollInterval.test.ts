// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  IDLE_POLL_MS,
  LIVE_POLL_STEPS_MS,
  LIVE_STEP_AFTER_MS,
  useLivePollInterval,
} from "@/widgets/sports/hooks/useLivePollInterval";

const [FAST, MEDIUM, SLOW] = LIVE_POLL_STEPS_MS;
const [FIRST_STEP_AFTER_MS, SECOND_STEP_AFTER_MS] = LIVE_STEP_AFTER_MS;

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  setVisibility("visible");
});

describe("useLivePollInterval", () => {
  it("polls slowly when nothing is live", () => {
    const { result } = renderHook(() => useLivePollInterval(false));
    expect(result.current).toBe(IDLE_POLL_MS);
  });

  it("polls fast as soon as a match goes live", () => {
    const { result } = renderHook(() => useLivePollInterval(true));
    expect(result.current).toBe(FAST);
  });

  it("backs off in steps while the tab stays continuously visible", () => {
    const { result } = renderHook(() => useLivePollInterval(true));

    act(() => void vi.advanceTimersByTime(FIRST_STEP_AFTER_MS));
    expect(result.current).toBe(MEDIUM);

    act(() => void vi.advanceTimersByTime(SECOND_STEP_AFTER_MS - FIRST_STEP_AFTER_MS));
    expect(result.current).toBe(SLOW);
  });

  it("returns to the fast cadence when the user comes back to the tab", () => {
    const { result } = renderHook(() => useLivePollInterval(true));

    act(() => void vi.advanceTimersByTime(SECOND_STEP_AFTER_MS));
    expect(result.current).toBe(SLOW);

    act(() => setVisibility("hidden"));
    expect(result.current).toBe(SLOW);

    act(() => setVisibility("visible"));
    expect(result.current).toBe(FAST);
  });

  it("resets the backoff when the live window ends and restarts", () => {
    const { result, rerender } = renderHook(({ live }) => useLivePollInterval(live), {
      initialProps: { live: true },
    });

    act(() => void vi.advanceTimersByTime(SECOND_STEP_AFTER_MS));
    expect(result.current).toBe(SLOW);

    rerender({ live: false });
    expect(result.current).toBe(IDLE_POLL_MS);

    rerender({ live: true });
    expect(result.current).toBe(FAST);
  });

  it("stops escalating once the hook unmounts", () => {
    const { unmount } = renderHook(() => useLivePollInterval(true));
    unmount();
    expect(() => vi.advanceTimersByTime(SECOND_STEP_AFTER_MS)).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });
});
