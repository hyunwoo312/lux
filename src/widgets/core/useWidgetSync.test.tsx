// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { create } from "zustand";
import { bumpSyncNonce, createSyncSlice, type SyncSlice } from "@/widgets/core/syncSlice";
import { createWidgetSync } from "@/widgets/core/useWidgetSync";

const KEY = "widget-1";

const useTestStore = create<SyncSlice>()((set) => createSyncSlice(set));

const { useSync, useSyncStatus } = createWidgetSync(useTestStore, () => KEY);

beforeEach(() => {
  useTestStore.setState({ syncNonce: {}, lastSyncAt: {}, dataSyncedAt: {}, syncing: {} });
});

describe("useWidgetSync", () => {
  it("refreshes once per nonce bump", () => {
    const refresh = vi.fn();
    renderHook(() => useSync(refresh, false, 0));

    expect(refresh).not.toHaveBeenCalled();

    act(() => useTestStore.setState((state) => bumpSyncNonce(state, KEY)));
    expect(refresh).toHaveBeenCalledTimes(1);

    act(() => useTestStore.setState((state) => bumpSyncNonce(state, KEY)));
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("reports syncing while any consumer is refreshing", () => {
    const first = renderHook(() => useSync(vi.fn(), true, 0));
    const second = renderHook(() => useSync(vi.fn(), true, 0));
    const { result } = renderHook(() => useSyncStatus());

    expect(result.current.syncing).toBe(true);

    act(() => first.unmount());
    expect(result.current.syncing).toBe(true);

    act(() => second.unmount());
    expect(result.current.syncing).toBe(false);
  });

  it("advances the freshness stamp forward only", () => {
    const { rerender } = renderHook(({ at }) => useSync(vi.fn(), false, at), {
      initialProps: { at: 200 },
    });
    const { result } = renderHook(() => useSyncStatus());

    expect(result.current.updatedAt).toBe(200);

    rerender({ at: 100 });
    expect(result.current.updatedAt).toBe(200);
  });
});
