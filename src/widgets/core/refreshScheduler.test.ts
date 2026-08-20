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

describe("reconnect clears backoff on every registered resource", () => {
  it("calls clearBackoff for polled and paged resources alike", () => {
    const polled = { cleared: 0, refreshed: 0 };
    const paged = { cleared: 0, refreshed: 0 };

    const unregisterPolled = refreshScheduler.register({
      id: "polled:test",
      staleMs: 0,
      getLastRefreshedAt: () => 0,
      refresh: () => (polled.refreshed += 1),
      clearBackoff: () => (polled.cleared += 1),
    });
    const unregisterPaged = refreshScheduler.register({
      id: "paged:test",
      staleMs: 0,
      getLastRefreshedAt: () => 0,
      refresh: () => (paged.refreshed += 1),
      clearBackoff: () => (paged.cleared += 1),
    });

    window.dispatchEvent(new Event("online"));

    expect(polled.cleared).toBe(1);
    expect(paged.cleared).toBe(1);
    expect(polled.refreshed).toBe(1);
    expect(paged.refreshed).toBe(1);

    unregisterPolled();
    unregisterPaged();
  });
});
