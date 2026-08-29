// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RETRY_BASE_MS,
  backoffDelayMs,
  effectiveCadence,
  patchPolledResource,
  retryDelayMs,
  stalePolledResource,
  usePolledResource,
} from "@/widgets/core/usePolledResource";
import { refreshScheduler } from "@/widgets/core/refreshScheduler";
import { RateLimitError } from "@/lib/net";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("backoffDelayMs", () => {
  it("backs off exponentially from the base and caps", () => {
    expect(backoffDelayMs(0)).toBe(0);
    expect(backoffDelayMs(1)).toBe(60_000);
    expect(backoffDelayMs(2)).toBe(120_000);
    expect(backoffDelayMs(3)).toBe(240_000);
    expect(backoffDelayMs(20)).toBe(30 * 60_000);
  });
});

describe("usePolledResource", () => {
  it("starts loading then resolves to success", async () => {
    const fetcher = vi.fn().mockResolvedValue([1, 2, 3]);
    const { result } = renderHook(() => usePolledResource(fetcher));

    expect(result.current.state.status).toBe("loading");
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    expect(result.current.state).toEqual({ status: "success", data: [1, 2, 3] });
  });

  it("reports empty for an empty array by default", async () => {
    const fetcher = vi.fn().mockResolvedValue([]);
    const { result } = renderHook(() => usePolledResource(fetcher));

    await waitFor(() => expect(result.current.state.status).toBe("empty"));
  });

  it("uses a custom isEmpty predicate", async () => {
    const fetcher = vi.fn().mockResolvedValue({ count: 0 });
    const { result } = renderHook(() =>
      usePolledResource(fetcher, { isEmpty: (data: { count: number }) => data.count === 0 }),
    );

    await waitFor(() => expect(result.current.state.status).toBe("empty"));
  });

  it("surfaces an error when the initial fetch fails", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => usePolledResource(fetcher));

    await waitFor(() => expect(result.current.state.status).toBe("error"));
    expect(result.current.state).toMatchObject({ status: "error", error: { message: "boom" } });
  });

  it("does not fetch while disabled", async () => {
    const fetcher = vi.fn().mockResolvedValue([1]);
    const { result } = renderHook(() => usePolledResource(fetcher, { enabled: false }));

    await act(async () => {});
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe("loading");
  });

  it("refetches when refresh() is called", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce([1]).mockResolvedValueOnce([1, 2]);
    const { result } = renderHook(() => usePolledResource(fetcher));

    await waitFor(() => expect(result.current.state).toEqual({ status: "success", data: [1] }));
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.state).toEqual({ status: "success", data: [1, 2] }));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("keeps cached data when a background refresh fails", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce([1])
      .mockRejectedValueOnce(new Error("transient"));
    const { result } = renderHook(() => usePolledResource(fetcher));

    await waitFor(() => expect(result.current.state).toEqual({ status: "success", data: [1] }));
    await act(async () => {
      result.current.refresh();
    });
    expect(result.current.state).toEqual({ status: "success", data: [1] });
  });

  it("polls on the interval while the document is visible", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockResolvedValue([1]);
    renderHook(() => usePolledResource(fetcher, { intervalMs: 1000 }));

    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("waits out a rate limit's retry-after before polling again", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockRejectedValue(new RateLimitError(45_000));
    renderHook(() => usePolledResource(fetcher, { intervalMs: 10_000 }));

    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(40_000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("keeps its backoff when the last consumer unmounts and comes back", async () => {
    const cacheKey = "backoff-remount";
    localStorage.setItem(
      `lux:polled:${cacheKey}`,
      JSON.stringify({ data: { value: 1 }, at: Date.now() - 20_000 }),
    );
    const fetcher = vi.fn().mockRejectedValue(new RateLimitError(45_000));
    const options = { cacheKey, persist: true, intervalMs: 10_000 };

    const first = renderHook(() => usePolledResource(fetcher, options));
    await waitFor(() => expect(first.result.current.freshness.status).toBe("failing"));
    expect(fetcher).toHaveBeenCalledTimes(1);
    first.unmount();

    renderHook(() => usePolledResource(fetcher, options));
    await act(async () => {});

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("reuses cached data on remount within the stale window without refetching", async () => {
    const fetcher = vi.fn().mockResolvedValue([1, 2]);
    const cacheKey = "test:cache:reuse";
    const first = renderHook(() => usePolledResource(fetcher, { cacheKey }));
    await waitFor(() => expect(first.result.current.state.status).toBe("success"));
    expect(fetcher).toHaveBeenCalledTimes(1);
    first.unmount();

    const second = renderHook(() => usePolledResource(fetcher, { cacheKey }));
    expect(second.result.current.state).toEqual({ status: "success", data: [1, 2] });
    await act(async () => {});
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("shares one fetch and live state across hooks with the same cacheKey", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce([1]).mockResolvedValue([1, 2]);
    const cacheKey = "test:cache:shared";
    const a = renderHook(() => usePolledResource(fetcher, { cacheKey }));
    const b = renderHook(() => usePolledResource(fetcher, { cacheKey }));

    await waitFor(() => expect(a.result.current.state.status).toBe("success"));
    await waitFor(() => expect(b.result.current.state.status).toBe("success"));
    expect(fetcher).toHaveBeenCalledTimes(1);

    act(() => a.result.current.refresh());
    await waitFor(() =>
      expect(b.result.current.state).toEqual({ status: "success", data: [1, 2] }),
    );
    expect(a.result.current.state).toEqual({ status: "success", data: [1, 2] });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("patchPolledResource", () => {
  it("updates a live resource without refetching", async () => {
    const fetcher = vi.fn().mockResolvedValue({ value: 1 });
    const { result } = renderHook(() =>
      usePolledResource(fetcher, { cacheKey: "patch-live", intervalMs: 10_000 }),
    );
    await waitFor(() => expect(result.current.state.status).toBe("success"));

    act(() =>
      patchPolledResource<{ value: number }>("patch-live", (data) => ({
        value: data.value + 1,
      })),
    );

    expect(result.current.state).toEqual({ status: "success", data: { value: 2 } });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("writes the patched value through to the persisted cache", async () => {
    const fetcher = vi.fn().mockResolvedValue({ value: 1 });
    const { result } = renderHook(() =>
      usePolledResource(fetcher, { cacheKey: "patch-persist", persist: true, intervalMs: 10_000 }),
    );
    await waitFor(() => expect(result.current.state.status).toBe("success"));

    act(() => patchPolledResource<{ value: number }>("patch-persist", () => ({ value: 7 })));

    expect(localStorage.getItem("lux:polled:patch-persist")).toContain('"value":7');
  });

  it("still patches the cache after the last consumer unmounts", async () => {
    const fetcher = vi.fn().mockResolvedValue({ value: 1 });
    const { result, unmount } = renderHook(() =>
      usePolledResource(fetcher, { cacheKey: "patch-detached", persist: true, intervalMs: 10_000 }),
    );
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    unmount();

    patchPolledResource<{ value: number }>("patch-detached", (data) => ({ value: data.value + 1 }));

    expect(localStorage.getItem("lux:polled:patch-detached")).toContain('"value":2');
  });

  it("ignores a key with no cached data", () => {
    const update = vi.fn();

    expect(() => patchPolledResource("patch-absent", update)).not.toThrow();
    expect(update).not.toHaveBeenCalled();
  });
});

describe("usePolledResource persistence", () => {
  it("persists a successful result to localStorage", async () => {
    const fetcher = vi.fn().mockResolvedValue({ value: 1 });
    const { result } = renderHook(() =>
      usePolledResource(fetcher, { cacheKey: "persist-write", persist: true }),
    );

    await waitFor(() => expect(result.current.state.status).toBe("success"));
    expect(localStorage.getItem("lux:polled:persist-write")).toContain('"value":1');
  });

  it("seeds instantly from a fresh persisted entry without fetching", () => {
    localStorage.setItem(
      "lux:polled:persist-seed",
      JSON.stringify({ data: { value: 2 }, at: Date.now() }),
    );
    const fetcher = vi.fn().mockResolvedValue({ value: 99 });

    const { result } = renderHook(() =>
      usePolledResource(fetcher, { cacheKey: "persist-seed", persist: true, intervalMs: 10_000 }),
    );

    expect(result.current.state).toEqual({ status: "success", data: { value: 2 } });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps an unmounted resource's cache when it is marked stale, then refetches on remount", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ value: 1 }).mockResolvedValue({ value: 2 });
    const options = { cacheKey: "persist-stale", persist: true, intervalMs: 10_000 };
    const first = renderHook(() => usePolledResource(fetcher, options));

    await waitFor(() =>
      expect(first.result.current.state).toEqual({ status: "success", data: { value: 1 } }),
    );
    first.unmount();
    act(() => stalePolledResource("persist-stale"));

    expect(localStorage.getItem("lux:polled:persist-stale")).toContain('"value":1');

    const second = renderHook(() => usePolledResource(fetcher, options));

    expect(second.result.current.state).toEqual({ status: "success", data: { value: 1 } });
    await waitFor(() =>
      expect(second.result.current.state).toEqual({ status: "success", data: { value: 2 } }),
    );
  });

  it("ignores a persisted entry rejected by the validator", async () => {
    localStorage.setItem(
      "lux:polled:persist-invalid",
      JSON.stringify({ data: { bad: true }, at: Date.now() }),
    );
    const fetcher = vi.fn().mockResolvedValue({ value: 3 });

    const { result } = renderHook(() =>
      usePolledResource(fetcher, {
        cacheKey: "persist-invalid",
        persist: true,
        parsePersisted: (raw) =>
          typeof raw === "object" && raw !== null && "value" in raw
            ? (raw as { value: number })
            : null,
      }),
    );

    expect(result.current.state.status).toBe("loading");
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "success", data: { value: 3 } }),
    );
  });
});

describe("retryDelayMs", () => {
  it("honours a rate limit's retryAfterMs instead of the backoff curve", () => {
    expect(retryDelayMs(new RateLimitError(45_000), 1)).toBe(45_000);
    expect(retryDelayMs(new RateLimitError(45_000), 5)).toBe(45_000);
  });

  it("falls back to the jittered curve for ordinary failures", () => {
    const delay = retryDelayMs(new Error("boom"), 1);
    expect(delay).toBeGreaterThanOrEqual(backoffDelayMs(1));
    expect(delay).toBeLessThan(backoffDelayMs(1) + RETRY_BASE_MS);
  });

  it("ignores a rate limit that carries no wait", () => {
    const delay = retryDelayMs(new RateLimitError(0), 2);
    expect(delay).toBeGreaterThanOrEqual(backoffDelayMs(2));
  });
});

describe("effectiveCadence", () => {
  it("falls back when nothing is subscribed", () => {
    expect(effectiveCadence([], { staleMs: 5, intervalMs: 6 })).toEqual({
      staleMs: 5,
      intervalMs: 6,
    });
  });

  it("takes the most demanding subscriber", () => {
    expect(
      effectiveCadence(
        [
          { staleMs: 600, intervalMs: 600 },
          { staleMs: 60, intervalMs: 60 },
        ],
        { staleMs: 1, intervalMs: 1 },
      ),
    ).toEqual({ staleMs: 60, intervalMs: 60 });
  });

  it("ignores subscribers that do not poll", () => {
    expect(
      effectiveCadence([{ staleMs: 300 }, { staleMs: 900, intervalMs: 900 }], { staleMs: 1 }),
    ).toEqual({ staleMs: 300, intervalMs: 900 });
  });
});

describe("two widgets sharing one resource", () => {
  let keySeed = 0;
  const nextKey = () => `cadence-${(keySeed += 1)}`;

  function lastCadence(register: ReturnType<typeof vi.spyOn>) {
    const calls = register.mock.calls;
    const last = calls[calls.length - 1]?.[0] as { staleMs: number; pollIntervalMs?: number };
    return { staleMs: last.staleMs, pollIntervalMs: last.pollIntervalMs };
  }

  it("polls at the interval of whichever widget wants it soonest", async () => {
    const register = vi.spyOn(refreshScheduler, "register");
    const cacheKey = nextKey();
    const fetcher = vi.fn().mockResolvedValue([1]);

    const slow = renderHook(() => usePolledResource(fetcher, { cacheKey, intervalMs: 600_000 }));
    await waitFor(() => expect(slow.result.current.state.status).toBe("success"));
    expect(lastCadence(register)).toEqual({ staleMs: 600_000, pollIntervalMs: 600_000 });

    const fast = renderHook(() => usePolledResource(fetcher, { cacheKey, intervalMs: 60_000 }));
    await waitFor(() => expect(fast.result.current.state.status).toBe("success"));

    expect(lastCadence(register)).toEqual({ staleMs: 60_000, pollIntervalMs: 60_000 });
  });

  it("adopts a new interval when one widget changes its setting, keeping its data", async () => {
    const register = vi.spyOn(refreshScheduler, "register");
    const cacheKey = nextKey();
    const fetcher = vi.fn().mockResolvedValue([1]);

    const { result, rerender } = renderHook(
      ({ intervalMs }: { intervalMs: number }) =>
        usePolledResource(fetcher, { cacheKey, intervalMs }),
      { initialProps: { intervalMs: 600_000 } },
    );
    await waitFor(() => expect(result.current.state.status).toBe("success"));

    rerender({ intervalMs: 60_000 });

    await waitFor(() => expect(lastCadence(register).pollIntervalMs).toBe(60_000));
    expect(result.current.state).toEqual({ status: "success", data: [1] });
  });

  it("relaxes again once the demanding widget is gone", async () => {
    const register = vi.spyOn(refreshScheduler, "register");
    const cacheKey = nextKey();
    const fetcher = vi.fn().mockResolvedValue([1]);

    const slow = renderHook(() => usePolledResource(fetcher, { cacheKey, intervalMs: 600_000 }));
    const fast = renderHook(() => usePolledResource(fetcher, { cacheKey, intervalMs: 60_000 }));
    await waitFor(() => expect(slow.result.current.state.status).toBe("success"));
    expect(lastCadence(register)).toEqual({ staleMs: 60_000, pollIntervalMs: 60_000 });

    act(() => fast.unmount());

    expect(lastCadence(register)).toEqual({ staleMs: 600_000, pollIntervalMs: 600_000 });
  });
});
