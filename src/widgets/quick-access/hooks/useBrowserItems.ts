import { useEffect, useMemo } from "react";
import { usePolledResource } from "@/widgets/core/usePolledResource";
import {
  fetchBookmarkTree,
  fetchHistory,
  fetchOpenTabs,
  fetchRecentlyClosed,
  fetchTopSites,
  watchTabs,
} from "@/widgets/quick-access/browser";
import type { BookmarkFolder, BrowserItem, ItemSource } from "@/widgets/quick-access/types";

type Retry = { retry: () => void };

export type BrowserState = Retry &
  ({ status: "loading" } | { status: "error" } | { status: "ready"; items: BrowserItem[] });

type BookmarkTreeState = Retry &
  ({ status: "loading" } | { status: "error" } | { status: "ready"; root: BookmarkFolder });

type PolledSource = Exclude<ItemSource, "openTabs">;

const FETCHERS: Record<PolledSource, () => Promise<BrowserItem[]>> = {
  recentlyClosed: fetchRecentlyClosed,
  history: fetchHistory,
  topSites: fetchTopSites,
};

const TABS_DEBOUNCE_MS = 150;

const REFRESH_MS = 60_000;

function useRefreshOnMount(refresh: () => void, enabled: boolean): void {
  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);
}

export function useBrowserItems(tab: PolledSource, enabled = true): BrowserState {
  const { state, refresh } = usePolledResource(() => FETCHERS[tab](), {
    enabled,
    intervalMs: REFRESH_MS,
    cacheKey: `quickAccess:${tab}`,
  });
  useRefreshOnMount(refresh, enabled);

  return useMemo(() => {
    if (state.status === "success") return { status: "ready", items: state.data, retry: refresh };
    if (state.status === "empty") return { status: "ready", items: [], retry: refresh };
    if (state.status === "error") return { status: "error", retry: refresh };
    return { status: "loading", retry: refresh };
  }, [state, refresh]);
}

export function useBookmarkTree(enabled = true): BookmarkTreeState {
  const { state, refresh } = usePolledResource(fetchBookmarkTree, {
    enabled,
    intervalMs: REFRESH_MS,
    cacheKey: "quickAccess:bookmarks",
  });
  useRefreshOnMount(refresh, enabled);

  return useMemo(() => {
    if (state.status === "success") return { status: "ready", root: state.data, retry: refresh };
    if (state.status === "error") return { status: "error", retry: refresh };
    return { status: "loading", retry: refresh };
  }, [state, refresh]);
}

export function useOpenTabs(enabled: boolean): BrowserState {
  const { state, refresh } = usePolledResource(fetchOpenTabs, {
    enabled,
    intervalMs: REFRESH_MS,
    cacheKey: "quickAccess:openTabs",
  });
  useRefreshOnMount(refresh, enabled);

  useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;
    const stop = watchTabs(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(refresh, TABS_DEBOUNCE_MS);
    });
    return () => {
      window.clearTimeout(timer);
      stop();
    };
  }, [enabled, refresh]);

  return useMemo(() => {
    if (state.status === "success") return { status: "ready", items: state.data, retry: refresh };
    if (state.status === "empty") return { status: "ready", items: [], retry: refresh };
    if (state.status === "error") return { status: "error", retry: refresh };
    return { status: "loading", retry: refresh };
  }, [state, refresh]);
}
