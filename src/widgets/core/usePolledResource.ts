import { useCallback, useEffect, useRef, useState } from "react";
import { refreshScheduler } from "@/widgets/core/refreshScheduler";

let nextInstanceId = 0;

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
  persist?: boolean;
  parsePersisted?: (raw: unknown) => T | null;
};

function defaultIsEmpty(data: unknown): boolean {
  return data == null || (Array.isArray(data) && data.length === 0);
}

type CacheEntry<T> = { data: T; at: number };

const resourceCache = new Map<string, CacheEntry<unknown>>();
const STORAGE_PREFIX = "lux:polled:";

function readPersisted<T>(
  cacheKey: string,
  parse?: (raw: unknown) => T | null,
): CacheEntry<T> | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + cacheKey);
    if (!raw) return undefined;
    const entry = JSON.parse(raw) as { data: unknown; at: unknown };
    if (typeof entry?.at !== "number") return undefined;
    const data = parse ? parse(entry.data) : (entry.data as T);
    if (data == null) return undefined;
    return { data, at: entry.at };
  } catch {
    return undefined;
  }
}

function writePersisted<T>(cacheKey: string, entry: CacheEntry<T>): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + cacheKey, JSON.stringify(entry));
  } catch {
    return;
  }
}

export function invalidatePolledResource(cacheKey: string): void {
  resourceCache.delete(cacheKey);
  try {
    localStorage.removeItem(STORAGE_PREFIX + cacheKey);
  } catch {
    return;
  }
}

export function usePolledResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: Options<T> = {},
): PolledResource<T> {
  const {
    enabled = true,
    intervalMs,
    refreshKey,
    isEmpty = defaultIsEmpty,
    cacheKey,
    persist = false,
    parsePersisted,
  } = options;
  const staleMs = intervalMs ?? 180_000;

  const seededRef = useRef(false);
  const seedRef = useRef<CacheEntry<T> | undefined>(undefined);
  if (!seededRef.current) {
    seededRef.current = true;
    if (cacheKey) {
      let entry = resourceCache.get(cacheKey) as CacheEntry<T> | undefined;
      if (!entry && persist) {
        const stored = readPersisted<T>(cacheKey, parsePersisted);
        if (stored) {
          entry = stored;
          resourceCache.set(cacheKey, stored);
        }
      }
      seedRef.current = entry;
    }
  }
  const initialCache = seedRef.current;

  const [data, setData] = useState<T | undefined>(initialCache?.data);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [hasLoaded, setHasLoaded] = useState(initialCache !== undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const cacheKeyRef = useRef(cacheKey);
  cacheKeyRef.current = cacheKey;
  const persistRef = useRef(persist);
  persistRef.current = persist;
  const hasLoadedRef = useRef(initialCache !== undefined);
  const lastRefreshedAtRef = useRef(initialCache?.at ?? 0);
  const instanceIdRef = useRef("");
  if (!instanceIdRef.current) instanceIdRef.current = `polled#${(nextInstanceId += 1)}`;
  const generationRef = useRef(0);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (background: boolean) => {
    if (background && inFlightRef.current) return;
    inFlightRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    const generation = generationRef.current;
    if (background) setIsRefreshing(true);
    try {
      const result = await fetcherRef.current(controller.signal);
      if (!mountedRef.current || generation !== generationRef.current) return;
      setData(result);
      setError(undefined);
      setHasLoaded(true);
      hasLoadedRef.current = true;
      lastRefreshedAtRef.current = Date.now();
      if (cacheKeyRef.current) {
        const entry: CacheEntry<T> = { data: result, at: Date.now() };
        resourceCache.set(cacheKeyRef.current, entry);
        if (persistRef.current) writePersisted(cacheKeyRef.current, entry);
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
    const cached = cacheKey
      ? (resourceCache.get(cacheKey) as CacheEntry<T> | undefined)
      : undefined;
    if (cached !== undefined) {
      hasLoadedRef.current = true;
      setHasLoaded(true);
      setData(cached.data);
      setError(undefined);
      if (Date.now() - cached.at >= staleMs) void run(true);
    } else {
      hasLoadedRef.current = false;
      setHasLoaded(false);
      setError(undefined);
      void run(false);
    }

    const unregister = refreshScheduler.register({
      id: instanceIdRef.current,
      staleMs,
      pollIntervalMs: intervalMs && intervalMs > 0 ? intervalMs : undefined,
      getLastRefreshedAt: () => lastRefreshedAtRef.current,
      refresh: () => void run(true),
    });

    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      unregister();
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
