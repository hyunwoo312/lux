import { useCallback, useEffect, useRef, useState } from "react";
import { refreshScheduler } from "@/widgets/core/refreshScheduler";

let nextInstanceId = 0;

export type PagedFetcher<T> = (
  page: number,
  signal: AbortSignal,
) => Promise<{ items: T[]; hasNextPage: boolean }>;

export type PagedResourceState<T> =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "empty" }
  | { status: "success"; items: T[] };

export type PagedResource<T> = {
  state: PagedResourceState<T>;
  hasMore: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  loadMore: () => void;
  refresh: () => void;
};

type Options<T> = {
  enabled?: boolean;
  intervalMs?: number;
  maxItems: number;
  cacheKey?: string;
  getKey: (item: T) => string | number;
  persist?: boolean;
  parsePersisted?: (raw: unknown) => T[] | null;
};

type CacheEntry<T> = { items: T[]; page: number; hasNextPage: boolean; at: number };

const resourceCache = new Map<string, CacheEntry<unknown>>();
const STORAGE_PREFIX = "lux:paged:";

function readPersisted<T>(
  cacheKey: string,
  parse?: (raw: unknown) => T[] | null,
): CacheEntry<T> | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + cacheKey);
    if (!raw) return undefined;
    const entry = JSON.parse(raw) as {
      items: unknown;
      page: unknown;
      hasNextPage: unknown;
      at: unknown;
    };
    if (
      typeof entry?.at !== "number" ||
      typeof entry.page !== "number" ||
      typeof entry.hasNextPage !== "boolean"
    ) {
      return undefined;
    }
    const items = parse ? parse(entry.items) : (entry.items as T[]);
    if (!items) return undefined;
    return { items, page: entry.page, hasNextPage: entry.hasNextPage, at: entry.at };
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

export function invalidatePagedResource(cacheKey: string): void {
  resourceCache.delete(cacheKey);
  try {
    localStorage.removeItem(STORAGE_PREFIX + cacheKey);
  } catch {
    return;
  }
}

function dedupe<T>(items: T[], getKey: (item: T) => string | number): T[] {
  const seen = new Set<string | number>();
  const out: T[] = [];
  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function usePagedResource<T>(
  fetcher: PagedFetcher<T>,
  {
    enabled = true,
    intervalMs,
    maxItems,
    cacheKey,
    getKey,
    persist = false,
    parsePersisted,
  }: Options<T>,
): PagedResource<T> {
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
  const seed = seedRef.current;

  const [items, setItems] = useState<T[]>(seed?.items ?? []);
  const [page, setPage] = useState(seed?.page ?? 0);
  const [hasNextPage, setHasNextPage] = useState(seed?.hasNextPage ?? false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [hasLoaded, setHasLoaded] = useState(seed !== undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const getKeyRef = useRef(getKey);
  getKeyRef.current = getKey;
  const cacheKeyRef = useRef(cacheKey);
  cacheKeyRef.current = cacheKey;
  const persistRef = useRef(persist);
  persistRef.current = persist;
  const stateRef = useRef({ items, page });
  stateRef.current = { items, page };
  const hasLoadedRef = useRef(seed !== undefined);
  const lastRefreshedAtRef = useRef(seed?.at ?? 0);
  const instanceIdRef = useRef("");
  if (!instanceIdRef.current) instanceIdRef.current = `paged#${(nextInstanceId += 1)}`;
  const generationRef = useRef(0);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (mode: "initial" | "refresh" | "more") => {
      if (inFlightRef.current) return;
      const nextPage = mode === "more" ? stateRef.current.page + 1 : 1;
      inFlightRef.current = true;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const generation = generationRef.current;
      if (mode === "refresh") setIsRefreshing(true);
      if (mode === "more") setIsLoadingMore(true);
      try {
        const result = await fetcherRef.current(nextPage, controller.signal);
        if (!mountedRef.current || generation !== generationRef.current) return;
        const merged =
          mode === "more"
            ? dedupe([...stateRef.current.items, ...result.items], getKeyRef.current)
            : result.items;
        const capped = merged.slice(0, maxItems);
        setItems(capped);
        setPage(nextPage);
        setHasNextPage(result.hasNextPage);
        setError(undefined);
        setHasLoaded(true);
        hasLoadedRef.current = true;
        lastRefreshedAtRef.current = Date.now();
        if (cacheKeyRef.current) {
          const entry: CacheEntry<T> = {
            items: capped,
            page: nextPage,
            hasNextPage: result.hasNextPage,
            at: Date.now(),
          };
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
        if (mountedRef.current) {
          setIsRefreshing(false);
          setIsLoadingMore(false);
        }
      }
    },
    [maxItems],
  );

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) return;
    generationRef.current += 1;
    const cached = cacheKey
      ? (resourceCache.get(cacheKey) as CacheEntry<T> | undefined)
      : undefined;
    if (cached) {
      hasLoadedRef.current = true;
      setHasLoaded(true);
      setItems(cached.items);
      setPage(cached.page);
      setHasNextPage(cached.hasNextPage);
      setError(undefined);
      if (Date.now() - cached.at >= staleMs) void run("refresh");
    } else {
      hasLoadedRef.current = false;
      setHasLoaded(false);
      setError(undefined);
      setItems([]);
      setPage(0);
      setHasNextPage(false);
      void run("initial");
    }

    const unregister = refreshScheduler.register({
      id: instanceIdRef.current,
      staleMs,
      pollIntervalMs: intervalMs && intervalMs > 0 ? intervalMs : undefined,
      getLastRefreshedAt: () => lastRefreshedAtRef.current,
      refresh: () => void run("refresh"),
    });

    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      unregister();
    };
  }, [enabled, intervalMs, cacheKey, staleMs, run]);

  const hasMore = hasNextPage && items.length < maxItems;

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    void run("more");
  }, [hasMore, run]);

  const refresh = useCallback(() => {
    void run("refresh");
  }, [run]);

  let state: PagedResourceState<T>;
  if (!hasLoaded) {
    state = error ? { status: "error", error } : { status: "loading" };
  } else if (items.length === 0) {
    state = { status: "empty" };
  } else {
    state = { status: "success", items };
  }

  return { state, hasMore, isLoadingMore, isRefreshing, loadMore, refresh };
}
