import { useEffect, useMemo } from "react";
import { usePolledResource } from "@/widgets/core/usePolledResource";
import {
  fetchBookmarkTree,
  fetchHistory,
  fetchRecentlyClosed,
  fetchTopSites,
} from "@/widgets/quick-access/browser";
import type { BookmarkFolder, BrowserItem, ItemSource } from "@/widgets/quick-access/types";

type BrowserState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; items: BrowserItem[] };

type BookmarkTreeState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; root: BookmarkFolder };

const FETCHERS: Record<ItemSource, () => Promise<BrowserItem[]>> = {
  recentlyClosed: fetchRecentlyClosed,
  history: fetchHistory,
  topSites: fetchTopSites,
};

const REFRESH_MS = 60_000;

function useRefreshOnMount(refresh: () => void, enabled: boolean): void {
  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);
}

export function useBrowserItems(tab: ItemSource, enabled = true): BrowserState {
  const { state, refresh } = usePolledResource(() => FETCHERS[tab](), {
    enabled,
    intervalMs: REFRESH_MS,
    cacheKey: `quickAccess:${tab}`,
  });
  useRefreshOnMount(refresh, enabled);

  return useMemo(() => {
    if (state.status === "success") return { status: "ready", items: state.data };
    if (state.status === "empty") return { status: "ready", items: [] };
    if (state.status === "error") return { status: "error" };
    return { status: "loading" };
  }, [state]);
}

export function useBookmarkTree(enabled = true): BookmarkTreeState {
  const { state, refresh } = usePolledResource(fetchBookmarkTree, {
    enabled,
    intervalMs: REFRESH_MS,
    cacheKey: "quickAccess:bookmarks",
  });
  useRefreshOnMount(refresh, enabled);

  return useMemo(() => {
    if (state.status === "success") return { status: "ready", root: state.data };
    if (state.status === "error") return { status: "error" };
    return { status: "loading" };
  }, [state]);
}
