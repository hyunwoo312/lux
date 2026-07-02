// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePagedResource } from "@/widgets/core/usePagedResource";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("usePagedResource", () => {
  it("starts loading then resolves to success", async () => {
    const fetcher = vi.fn().mockResolvedValue({ items: [1, 2], hasNextPage: false });
    const { result } = renderHook(() =>
      usePagedResource(fetcher, { maxItems: 50, getKey: (n: number) => n }),
    );

    expect(result.current.state.status).toBe("loading");
    await waitFor(() => expect(result.current.state).toEqual({ status: "success", items: [1, 2] }));
  });

  it("reports empty when the first page has no items", async () => {
    const fetcher = vi.fn().mockResolvedValue({ items: [], hasNextPage: false });
    const { result } = renderHook(() =>
      usePagedResource(fetcher, { maxItems: 50, getKey: (n: number) => n }),
    );

    await waitFor(() => expect(result.current.state.status).toBe("empty"));
  });

  it("surfaces an error when the initial fetch fails", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() =>
      usePagedResource(fetcher, { maxItems: 50, getKey: (n: number) => n }),
    );

    await waitFor(() => expect(result.current.state.status).toBe("error"));
  });

  it("does not fetch while disabled", async () => {
    const fetcher = vi.fn().mockResolvedValue({ items: [1], hasNextPage: false });
    renderHook(() =>
      usePagedResource(fetcher, { maxItems: 50, getKey: (n: number) => n, enabled: false }),
    );

    await act(async () => {});
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("appends and dedupes the next page on loadMore", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ items: [1, 2], hasNextPage: true })
      .mockResolvedValueOnce({ items: [2, 3], hasNextPage: false });
    const { result } = renderHook(() =>
      usePagedResource(fetcher, { maxItems: 50, getKey: (n: number) => n }),
    );

    await waitFor(() => expect(result.current.state).toEqual({ status: "success", items: [1, 2] }));
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.loadMore());
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: "success", items: [1, 2, 3] }),
    );
    expect(result.current.hasMore).toBe(false);
    expect(fetcher).toHaveBeenNthCalledWith(1, 1, expect.anything());
    expect(fetcher).toHaveBeenNthCalledWith(2, 2, expect.anything());
  });

  it("refetches the first page on refresh()", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ items: [1], hasNextPage: false })
      .mockResolvedValueOnce({ items: [1, 2], hasNextPage: false });
    const { result } = renderHook(() =>
      usePagedResource(fetcher, { maxItems: 50, getKey: (n: number) => n }),
    );

    await waitFor(() => expect(result.current.state).toEqual({ status: "success", items: [1] }));
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.state).toEqual({ status: "success", items: [1, 2] }));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("reuses cached data on remount within the stale window without refetching", async () => {
    const fetcher = vi.fn().mockResolvedValue({ items: [1, 2], hasNextPage: false });
    const cacheKey = "test:paged:reuse";
    const first = renderHook(() =>
      usePagedResource(fetcher, { maxItems: 50, getKey: (n: number) => n, cacheKey }),
    );
    await waitFor(() => expect(first.result.current.state.status).toBe("success"));
    expect(fetcher).toHaveBeenCalledTimes(1);
    first.unmount();

    const second = renderHook(() =>
      usePagedResource(fetcher, { maxItems: 50, getKey: (n: number) => n, cacheKey }),
    );
    expect(second.result.current.state).toEqual({ status: "success", items: [1, 2] });
    await act(async () => {});
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not show the previous key's items after cacheKey changes", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ items: [1], hasNextPage: false })
      .mockResolvedValue({ items: [2], hasNextPage: false });
    const { result, rerender } = renderHook(
      ({ cacheKey }: { cacheKey: string }) =>
        usePagedResource(fetcher, { maxItems: 50, getKey: (n: number) => n, cacheKey }),
      { initialProps: { cacheKey: "test:paged:key-a" } },
    );
    await waitFor(() => expect(result.current.state).toEqual({ status: "success", items: [1] }));

    rerender({ cacheKey: "test:paged:key-b" });

    expect(result.current.state.status).toBe("loading");
    await waitFor(() => expect(result.current.state).toEqual({ status: "success", items: [2] }));
  });

  it("shares one fetch and live state across hooks with the same cacheKey", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ items: [1], hasNextPage: true })
      .mockResolvedValue({ items: [2], hasNextPage: false });
    const cacheKey = "test:paged:shared";
    const a = renderHook(() =>
      usePagedResource(fetcher, { maxItems: 50, getKey: (n: number) => n, cacheKey }),
    );
    const b = renderHook(() =>
      usePagedResource(fetcher, { maxItems: 50, getKey: (n: number) => n, cacheKey }),
    );

    await waitFor(() => expect(a.result.current.state.status).toBe("success"));
    await waitFor(() => expect(b.result.current.state.status).toBe("success"));
    expect(fetcher).toHaveBeenCalledTimes(1);

    act(() => a.result.current.loadMore());
    await waitFor(() => expect(b.result.current.state).toEqual({ status: "success", items: [1, 2] }));
    expect(a.result.current.state).toEqual({ status: "success", items: [1, 2] });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("usePagedResource persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists a successful result to localStorage", async () => {
    const fetcher = vi.fn().mockResolvedValue({ items: [1], hasNextPage: false });
    renderHook(() =>
      usePagedResource(fetcher, {
        maxItems: 50,
        getKey: (n: number) => n,
        cacheKey: "paged-write",
        persist: true,
      }),
    );

    await waitFor(() => expect(localStorage.getItem("lux:paged:paged-write")).toContain('"items":[1]'));
  });
});