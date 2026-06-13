import { useCallback, useEffect, useRef, useState } from "react";

export type PolledResourceState<T> =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "empty" }
  | { status: "success"; data: T };

export type PolledResource<T> = {
  state: PolledResourceState<T>;
  isRefreshing: boolean;
  refresh: () => void;
};

type Options<T> = {
  enabled?: boolean;
  intervalMs?: number;
  refreshKey?: string | number;
  isEmpty?: (data: T) => boolean;
  cacheKey?: string;
};

function defaultIsEmpty(data: unknown): boolean {
  return data == null || (Array.isArray(data) && data.length === 0);
}

const resourceCache = new Map<string, { data: unknown; at: number }>();

export function invalidatePolledResource(cacheKey: string): void {
  resourceCache.delete(cacheKey);
}

export function usePolledResource<T>(
  fetcher: () => Promise<T>,
  options: Options<T> = {},
): PolledResource<T> {
  const { enabled = true, intervalMs, refreshKey, isEmpty = defaultIsEmpty, cacheKey } = options;
  const staleMs = intervalMs ?? 60_000;

  const initialCache = cacheKey ? resourceCache.get(cacheKey) : undefined;

  const [data, setData] = useState<T | undefined>(initialCache?.data as T | undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [hasLoaded, setHasLoaded] = useState(initialCache !== undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const cacheKeyRef = useRef(cacheKey);
  cacheKeyRef.current = cacheKey;
  const hasLoadedRef = useRef(initialCache !== undefined);
  const generationRef = useRef(0);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  const run = useCallback(async (background: boolean) => {
    if (background && inFlightRef.current) return;
    inFlightRef.current = true;
    const generation = generationRef.current;
    if (background) setIsRefreshing(true);
    try {
      const result = await fetcherRef.current();
      if (!mountedRef.current || generation !== generationRef.current) return;
      setData(result);
      setError(undefined);
      setHasLoaded(true);
      hasLoadedRef.current = true;
      if (cacheKeyRef.current) {
        resourceCache.set(cacheKeyRef.current, { data: result, at: Date.now() });
      }
    } catch (caught) {
      if (!mountedRef.current || generation !== generationRef.current) return;
      if (!hasLoadedRef.current) {
        setError(caught instanceof Error ? caught : new Error("Request failed"));
      }
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current && background) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) return;

    generationRef.current += 1;
    const cached = cacheKey ? resourceCache.get(cacheKey) : undefined;
    if (cached !== undefined && Date.now() - cached.at < staleMs) {
      hasLoadedRef.current = true;
      setHasLoaded(true);
      setData(cached.data as T);
      setError(undefined);
    } else {
      hasLoadedRef.current = false;
      setHasLoaded(false);
      setError(undefined);
      void run(false);
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible") return;
      void run(true);
    };

    const intervalId =
      intervalMs && intervalMs > 0 ? window.setInterval(refreshWhenVisible, intervalMs) : undefined;
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      mountedRef.current = false;
      if (intervalId !== undefined) window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [enabled, intervalMs, refreshKey, cacheKey, staleMs, run]);

  const refresh = useCallback(() => {
    void run(true);
  }, [run]);

  let state: PolledResourceState<T>;
  if (!hasLoaded) {
    state = error ? { status: "error", error } : { status: "loading" };
  } else if (data === undefined || isEmpty(data)) {
    state = { status: "empty" };
  } else {
    state = { status: "success", data };
  }

  return { state, isRefreshing, refresh };
}
