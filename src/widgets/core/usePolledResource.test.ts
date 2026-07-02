// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { backoffDelayMs, usePolledResource } from "@/widgets/core/usePolledResource";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("backoffDelayMs", () => {
  it("has no delay before any failure", () => {
    expect(backoffDelayMs(0)).toBe(0);
  });

  it("doubles from the base with each consecutive failure", () => {
    expect(backoffDelayMs(1)).toBe(60_000);
    expect(backoffDelayMs(2)).toBe(120_000);
    expect(backoffDelayMs(3)).toBe(240_000);
  });

  it("caps at the maximum", () => {
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

  it("refetches a fresh load when refreshKey changes", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(["a"]).mockResolvedValueOnce(["b"]);
    const { result, rerender } = renderHook(
      ({ key }) => usePolledResource(fetcher, { refreshKey: key }),
      {
        initialProps: { key: "first" },
      },
    );

    await waitFor(() => expect(result.current.state).toEqual({ status: "success", data: ["a"] }));
    rerender({ key: "second" });
    expect(result.current.state.status).toBe("loading");
    await waitFor(() => expect(result.current.state).toEqual({ status: "success", data: ["b"] }));
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

describe("usePolledResource persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

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