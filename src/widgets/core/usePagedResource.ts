import { useCallback, useEffect, useRef, useState } from "react";
import { refreshScheduler } from "@/widgets/core/refreshScheduler";
import { backoffDelayMs, RETRY_BASE_MS } from "@/widgets/core/usePolledResource";

let nextAutoKey = 0;
const DEFAULT_STALE_MS = 180_000;
const STORAGE_PREFIX = "lux:paged:";

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

type Snapshot<T> = {
  items: T[];
  page: number;
  hasNextPage: boolean;
  error: Error | undefined;
  hasLoaded: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  at: number;
};

function emptySnapshot<T>(): Snapshot<T> {
  return {
    items: [],
    page: 0,
    hasNextPage: false,
    error: undefined,
    hasLoaded: false,
    isRefreshing: false,
    isLoadingMore: false,
    at: 0,
  };
}

function seedSnapshot<T>(
  enabled: boolean,
  cacheKey: string | undefined,
  persist: boolean,
  parsePersisted?: (raw: unknown) => T[] | null,
): Snapshot<T> {
  const seed = enabled && cacheKey ? seededEntry<T>(cacheKey, persist, parsePersisted) : undefined;
  return seed
    ? {
        items: seed.items,
        page: seed.page,
        hasNextPage: seed.hasNextPage,
        error: undefined,
        hasLoaded: true,
        isRefreshing: false,
        isLoadingMore: false,
        at: seed.at,
      }
    : emptySnapshot<T>();
}

type CacheEntry<T> = { items: T[]; page: number; hasNextPage: boolean; at: number };

const dataCache = new Map<string, CacheEntry<unknown>>();

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
    if (!items || items.length === 0) return undefined;
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

function removePersisted(cacheKey: string): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + cacheKey);
  } catch {
    return;
  }
}

function seededEntry<T>(
  cacheKey: string,
  persist: boolean,
  parsePersisted?: (raw: unknown) => T[] | null,
): CacheEntry<T> | undefined {
  let entry = dataCache.get(cacheKey) as CacheEntry<T> | undefined;
  if (!entry && persist) {
    const stored = readPersisted<T>(cacheKey, parsePersisted);
    if (stored) {
      entry = stored;
      dataCache.set(cacheKey, stored);
    }
  }
  return entry;
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

type ResourceConfig<T> = {
  key: string;
  cacheKey?: string;
  staleMs: number;
  intervalMs?: number;
  maxItems: number;
  persist: boolean;
  parsePersisted?: (raw: unknown) => T[] | null;
  getKey: (item: T) => string | number;
};

type Mode = "initial" | "refresh" | "more";

const liveResources = new Map<string, SharedResource<unknown>>();

class SharedResource<T> {
  private snapshot: Snapshot<T>;
  private readonly listeners = new Set<(snapshot: Snapshot<T>) => void>();
  private fetcher: PagedFetcher<T>;
  private subscribers = 0;
  private generation = 0;
  private inFlight: Promise<void> | null = null;
  private abort: AbortController | null = null;
  private unregister: (() => void) | null = null;
  private failureCount = 0;
  private retryAt = 0;

  constructor(
    private readonly config: ResourceConfig<T>,
    fetcher: PagedFetcher<T>,
  ) {
    this.fetcher = fetcher;
    const seed = config.cacheKey
      ? seededEntry<T>(config.cacheKey, config.persist, config.parsePersisted)
      : undefined;
    this.snapshot = seed
      ? {
          items: seed.items,
          page: seed.page,
          hasNextPage: seed.hasNextPage,
          error: undefined,
          hasLoaded: true,
          isRefreshing: false,
          isLoadingMore: false,
          at: seed.at,
        }
      : emptySnapshot<T>();
  }

  getSnapshot(): Snapshot<T> {
    return this.snapshot;
  }

  setFetcher(fetcher: PagedFetcher<T>): void {
    this.fetcher = fetcher;
  }

  subscribe(listener: (snapshot: Snapshot<T>) => void): () => void {
    this.listeners.add(listener);
    this.subscribers += 1;
    if (this.subscribers === 1) this.start();
    return () => {
      this.listeners.delete(listener);
      this.subscribers -= 1;
      if (this.subscribers === 0) this.stop();
    };
  }

  refresh(): void {
    void this.run("refresh");
  }

  private pollRefresh(): void {
    if (Date.now() < this.retryAt) return;
    void this.run("refresh");
  }

  loadMore(): void {
    if (!this.snapshot.hasNextPage) return;
    void this.run("more");
  }

  markStale(): void {
    this.failureCount = 0;
    this.retryAt = 0;
    this.patch({ at: 0 });
  }

  private patch(part: Partial<Snapshot<T>>): void {
    this.snapshot = { ...this.snapshot, ...part };
    for (const listener of this.listeners) listener(this.snapshot);
  }

  private start(): void {
    if (!this.snapshot.hasLoaded) void this.run("initial");
    else if (Date.now() - this.snapshot.at >= this.config.staleMs) void this.run("refresh");

    this.unregister = refreshScheduler.register({
      id: `paged:${this.config.key}`,
      staleMs: this.config.staleMs,
      pollIntervalMs:
        this.config.intervalMs && this.config.intervalMs > 0 ? this.config.intervalMs : undefined,
      getLastRefreshedAt: () => this.snapshot.at,
      refresh: () => this.pollRefresh(),
    });
  }

  private stop(): void {
    this.generation += 1;
    this.abort?.abort();
    this.abort = null;
    this.unregister?.();
    this.unregister = null;
    this.inFlight = null;
    liveResources.delete(this.config.key);
  }

  private run(mode: Mode): Promise<void> {
    if (this.inFlight) return this.inFlight;
    const generation = (this.generation += 1);
    const nextPage = mode === "more" ? this.snapshot.page + 1 : 1;
    const controller = new AbortController();
    this.abort = controller;
    if (mode === "refresh") this.patch({ isRefreshing: true });
    if (mode === "more") this.patch({ isLoadingMore: true });

    const promise = (async () => {
      try {
        const result = await this.fetcher(nextPage, controller.signal);
        if (generation !== this.generation) return;
        const merged =
          mode === "more"
            ? dedupe([...this.snapshot.items, ...result.items], this.config.getKey)
            : result.items;
        const items = merged.slice(0, this.config.maxItems);
        const at = Date.now();
        if (this.config.cacheKey) {
          if (items.length > 0) {
            const entry: CacheEntry<T> = {
              items,
              page: nextPage,
              hasNextPage: result.hasNextPage,
              at,
            };
            dataCache.set(this.config.cacheKey, entry);
            if (this.config.persist) writePersisted(this.config.cacheKey, entry);
          } else {
            dataCache.delete(this.config.cacheKey);
            if (this.config.persist) removePersisted(this.config.cacheKey);
          }
        }
        this.failureCount = 0;
        this.retryAt = 0;
        this.patch({
          items,
          page: nextPage,
          hasNextPage: result.hasNextPage,
          error: undefined,
          hasLoaded: true,
          isRefreshing: false,
          isLoadingMore: false,
          at,
        });
      } catch (caught) {
        if (generation !== this.generation) return;
        const error = caught instanceof Error ? caught : new Error("Request failed");
        this.failureCount += 1;
        this.retryAt =
          Date.now() + backoffDelayMs(this.failureCount) + Math.random() * RETRY_BASE_MS;
        this.patch(
          this.snapshot.hasLoaded
            ? { isRefreshing: false, isLoadingMore: false }
            : { error, isRefreshing: false, isLoadingMore: false },
        );
      } finally {
        this.inFlight = null;
      }
    })();
    this.inFlight = promise;
    return promise;
  }
}

function acquireResource<T>(config: ResourceConfig<T>, fetcher: PagedFetcher<T>): SharedResource<T> {
  let resource = liveResources.get(config.key) as SharedResource<T> | undefined;
  if (!resource) {
    resource = new SharedResource<T>(config, fetcher);
    liveResources.set(config.key, resource as SharedResource<unknown>);
  } else {
    resource.setFetcher(fetcher);
  }
  return resource;
}

export function invalidatePagedResource(cacheKey: string): void {
  dataCache.delete(cacheKey);
  removePersisted(cacheKey);
  (liveResources.get(cacheKey) as SharedResource<unknown> | undefined)?.markStale();
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
  const staleMs = intervalMs ?? DEFAULT_STALE_MS;

  const autoKeyRef = useRef("");
  if (!autoKeyRef.current) autoKeyRef.current = `paged#${(nextAutoKey += 1)}`;
  const key = cacheKey ?? autoKeyRef.current;

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const getKeyRef = useRef(getKey);
  getKeyRef.current = getKey;
  const maxItemsRef = useRef(maxItems);
  maxItemsRef.current = maxItems;
  const persistRef = useRef(persist);
  persistRef.current = persist;
  const parsePersistedRef = useRef(parsePersisted);
  parsePersistedRef.current = parsePersisted;

  const [snapshot, setSnapshot] = useState<Snapshot<T>>(() =>
    seedSnapshot<T>(enabled, cacheKey, persist, parsePersisted),
  );

  const keyRef = useRef(key);
  if (keyRef.current !== key) {
    keyRef.current = key;
    setSnapshot(seedSnapshot<T>(enabled, cacheKey, persistRef.current, parsePersistedRef.current));
  }

  const resourceRef = useRef<SharedResource<T> | null>(null);

  useEffect(() => {
    if (!enabled) {
      resourceRef.current = null;
      return;
    }
    const resource = acquireResource<T>(
      {
        key,
        cacheKey,
        staleMs,
        intervalMs,
        maxItems: maxItemsRef.current,
        persist: persistRef.current,
        parsePersisted: parsePersistedRef.current,
        getKey: getKeyRef.current,
      },
      (page, signal) => fetcherRef.current(page, signal),
    );
    resourceRef.current = resource;
    setSnapshot(resource.getSnapshot());
    const unsubscribe = resource.subscribe(setSnapshot);
    return () => {
      resourceRef.current = null;
      unsubscribe();
    };
  }, [key, cacheKey, enabled, staleMs, intervalMs]);

  const hasMore = snapshot.hasNextPage && snapshot.items.length < maxItems;

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    resourceRef.current?.loadMore();
  }, [hasMore]);

  const refresh = useCallback(() => {
    resourceRef.current?.refresh();
  }, []);

  let state: PagedResourceState<T>;
  if (!snapshot.hasLoaded) {
    state = snapshot.error ? { status: "error", error: snapshot.error } : { status: "loading" };
  } else if (snapshot.items.length === 0) {
    state = { status: "empty" };
  } else {
    state = { status: "success", items: snapshot.items };
  }

  return {
    state,
    hasMore,
    isLoadingMore: snapshot.isLoadingMore,
    isRefreshing: snapshot.isRefreshing,
    loadMore,
    refresh,
  };
}
