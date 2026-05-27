import { useEffect, useState } from "react";
import {
  fetchBookmarks,
  fetchHistory,
  fetchRecentlyClosed,
  fetchTopSites,
} from "@/widgets/quick-access/browser";
import type { BrowserItem, BrowserSource } from "@/widgets/quick-access/types";

type BrowserState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; items: BrowserItem[] };

const FETCHERS: Record<BrowserSource, () => Promise<BrowserItem[]>> = {
  bookmarks: fetchBookmarks,
  recentlyClosed: fetchRecentlyClosed,
  history: fetchHistory,
  topSites: fetchTopSites,
};

const REFRESH_MS = 60_000;

export function useBrowserItems(tab: BrowserSource, enabled = true): BrowserState {
  const [state, setState] = useState<BrowserState>({ status: "loading" });

  useEffect(() => {
    if (!enabled) {
      setState({ status: "ready", items: [] });
      return;
    }
    let active = true;
    let fetching = false;
    let lastRefresh = 0;

    const refresh = async (showLoading: boolean, force = false) => {
      if (!active || fetching) return;
      if (!force && Date.now() - lastRefresh < REFRESH_MS) return;
      fetching = true;
      if (showLoading) setState({ status: "loading" });
      try {
        const items = await FETCHERS[tab]();
        if (active) {
          lastRefresh = Date.now();
          setState({ status: "ready", items });
        }
      } catch {
        if (active) setState({ status: "error" });
      } finally {
        fetching = false;
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "hidden") return;
      void refresh(false);
    };

    void refresh(true, true);

    const interval = window.setInterval(refreshWhenVisible, REFRESH_MS);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [tab, enabled]);

  return state;
}
