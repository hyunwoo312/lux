// @vitest-environment jsdom
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  freshnessOf,
  peekFreshness,
  useFreshness,
  usePolledResource,
} from "@/widgets/core/usePolledResource";

describe("freshness", () => {
  it("reports a failing refresh that happened after data had loaded", () => {
    const result = freshnessOf({
      hasLoaded: true,
      refreshError: new Error("offline"),
      failureCount: 3,
      at: 1000,
    });
    expect(result).toEqual({
      status: "failing",
      error: expect.any(Error),
      failures: 3,
      since: 1000,
    });
  });

  it("stays current while the first load is still failing, so the error drives the state instead", () => {
    expect(
      freshnessOf({ hasLoaded: false, refreshError: new Error("x"), failureCount: 1, at: 0 }),
    ).toEqual({ status: "current" });
  });

  it("clears once a refresh succeeds", () => {
    expect(
      freshnessOf({ hasLoaded: true, refreshError: undefined, failureCount: 0, at: 2000 }),
    ).toEqual({ status: "current" });
  });
});

describe("useFreshness", () => {
  it("keeps a stable reference while nothing changes, so useSyncExternalStore does not loop", () => {
    expect(peekFreshness("stable-probe:")).toBe(peekFreshness("stable-probe:"));
  });

  it("reports a resource whose refresh fails after it had already loaded", async () => {
    let attempt = 0;
    const fetcher = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) return "data";
      throw new Error("offline");
    });

    const resource = renderHook(() =>
      usePolledResource(fetcher, { cacheKey: "probe:one", intervalMs: 10_000 }),
    );
    await waitFor(() => expect(resource.result.current.state.status).toBe("success"));

    const watcher = renderHook(() => useFreshness("probe:"));
    expect(watcher.result.current.status).toBe("current");

    await act(async () => {
      resource.result.current.refresh();
    });

    await waitFor(() => expect(watcher.result.current.status).toBe("failing"));
    expect(resource.result.current.state.status).toBe("success");
  });

  it("ignores resources under a different prefix", () => {
    expect(peekFreshness("unrelated:").status).toBe("current");
  });
});
