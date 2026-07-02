// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { refreshScheduler } from "@/widgets/core/refreshScheduler";

afterEach(() => {
  vi.useRealTimers();
});

describe("refreshScheduler", () => {
  it("refreshes a polling resource once its stale window elapses", () => {
    vi.useFakeTimers();
    let lastRefreshedAt = Date.now();
    const refresh = vi.fn(() => {
      lastRefreshedAt = Date.now();
    });
    const unregister = refreshScheduler.register({
      id: "stale-window",
      staleMs: 1000,
      pollIntervalMs: 1000,
      getLastRefreshedAt: () => lastRefreshedAt,
      refresh,
    });

    vi.advanceTimersByTime(1000);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(refresh).toHaveBeenCalledTimes(2);

    unregister();
    vi.advanceTimersByTime(5000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("does not refresh a resource still inside its stale window", () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    const unregister = refreshScheduler.register({
      id: "fresh",
      staleMs: 10_000,
      pollIntervalMs: 1000,
      getLastRefreshedAt: () => Date.now(),
      refresh,
    });

    vi.advanceTimersByTime(5000);
    expect(refresh).not.toHaveBeenCalled();
    unregister();
  });

  it("ticks at the fastest registered cadence", () => {
    vi.useFakeTimers();
    const fast = vi.fn();
    const slow = vi.fn();
    const unregisterFast = refreshScheduler.register({
      id: "fast",
      staleMs: 1000,
      pollIntervalMs: 1000,
      getLastRefreshedAt: () => 0,
      refresh: fast,
    });
    const unregisterSlow = refreshScheduler.register({
      id: "slow",
      staleMs: 1000,
      pollIntervalMs: 60_000,
      getLastRefreshedAt: () => 0,
      refresh: slow,
    });

    vi.advanceTimersByTime(1000);
    expect(fast).toHaveBeenCalledTimes(1);
    expect(slow).toHaveBeenCalledTimes(1);

    unregisterFast();
    unregisterSlow();
  });
});