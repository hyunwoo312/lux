import { useCallback, useEffect, useRef, useState } from "react";
import { refreshScheduler } from "@/widgets/core/refreshScheduler";

let nextAutoKey = 0;
const DEFAULT_STALE_MS = 180_000;
const STORAGE_PREFIX = "lux:polled:";

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

type Snapshot<T> = {
  data: T | undefined;
  error: Error | undefined;
  hasLoaded: boolean;
  isRefreshing: boolean;
  at: number;
};

const LOADING: Snapshot<never> = {
  data: undefined,
  error: undefined,
  hasLoaded: false,
  isRefreshing: false,
  at: 0,
};

type CacheEntry<T> = { data: T; at: number };

const dataCache = new Map<string, CacheEntry<unknown>>();

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
  parsePersisted?: (raw: unknown) => T | null,
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

type ResourceConfig<T> = {
  key: string;
  cacheKey?: string;
  staleMs: number;
  intervalMs?: number;
  persist: boolean;
  parsePersisted?: (raw: unknown) => T | null;
};

const liveResources = new Map<string, SharedResource<unknown>>();

class SharedResource<T> {
  private snapshot: Snapshot<T>;
  private readonly listeners = new Set<(snapshot: Snapshot<T>) => void>();
  private fetcher: (signal: AbortSignal) => Promise<T>;
  private subscribers = 0;
  private generation = 0;
  private inFlight: Promise<void> | null = null;
  private abort: AbortController | null = null;
  private unregister: (() => void) | null = null;

  constructor(
    private readonly config: ResourceConfig<T>,
    fetcher: (signal: AbortSignal) => Promise<T>,
  ) {
    this.fetcher = fetcher;
    const seed = config.cacheKey
      ? seededEntry<T>(config.cacheKey, config.persist, config.parsePersisted)
      : undefined;
    this.snapshot = seed
      ? { data: seed.data, error: undefined, hasLoaded: true, isRefreshing: false, at: seed.at }
      : { ...LOADING };
  }

  getSnapshot(): Snapshot<T> {
    return this.snapshot;
  }

  setFetcher(fetcher: (signal: AbortSignal) => Promise<T>): void {
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
    void this.run(true);
  }

  markStale(): void {
    this.patch({ at: 0 });
  }

  private patch(part: Partial<Snapshot<T>>): void {
    this.snapshot = { ...this.snapshot, ...part };
    for (const listener of this.listeners) listener(this.snapshot);
  }

  private start(): void {
    if (!this.snapshot.hasLoaded) void this.run(false);
    else if (Date.now() - this.snapshot.at >= this.config.staleMs) void this.run(true);

    this.unregister = refreshScheduler.register({
      id: `polled:${this.config.key}`,
      staleMs: this.config.staleMs,
      pollIntervalMs:
        this.config.intervalMs && this.config.intervalMs > 0 ? this.config.intervalMs : undefined,
      getLastRefreshedAt: () => this.snapshot.at,
      refresh: () => void this.run(true),
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

  private run(background: boolean): Promise<void> {
    if (this.inFlight) return this.inFlight;
    const generation = (this.generation += 1);
    const controller = new AbortController();
    this.abort = controller;
    if (background) this.patch({ isRefreshing: true });

    const promise = (async () => {
      try {
        const data = await this.fetcher(controller.signal);
        if (generation !== this.generation) return;
        const at = Date.now();
        if (this.config.cacheKey) {
          const entry: CacheEntry<T> = { data, at };
          dataCache.set(this.config.cacheKey, entry);
          if (this.config.persist) writePersisted(this.config.cacheKey, entry);
        }
        this.patch({ data, error: undefined, hasLoaded: true, isRefreshing: false, at });
      } catch (caught) {
        if (generation !== this.generation) return;
        const error = caught instanceof Error ? caught : new Error("Request failed");
        this.patch(this.snapshot.hasLoaded ? { isRefreshing: false } : { error, isRefreshing: false });
      } finally {
        this.inFlight = null;
      }
    })();
    this.inFlight = promise;
    return promise;
  }
}

function acquireResource<T>(
  config: ResourceConfig<T>,
  fetcher: (signal: AbortSignal) => Promise<T>,
): SharedResource<T> {
  let resource = liveResources.get(config.key) as SharedResource<T> | undefined;
  if (!resource) {
    resource = new SharedResource<T>(config, fetcher);
    liveResources.set(config.key, resource as SharedResource<unknown>);
  } else {
    resource.setFetcher(fetcher);
  }
  return resource;
}

export function invalidatePolledResource(cacheKey: string): void {
  dataCache.delete(cacheKey);
  removePersisted(cacheKey);
  (liveResources.get(cacheKey) as SharedResource<unknown> | undefined)?.markStale();
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
  const staleMs = intervalMs ?? DEFAULT_STALE_MS;

  const autoKeyRef = useRef("");
  if (!autoKeyRef.current) autoKeyRef.current = `polled#${(nextAutoKey += 1)}`;
  const key = cacheKey ?? autoKeyRef.current;

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const persistRef = useRef(persist);
  persistRef.current = persist;
  const parsePersistedRef = useRef(parsePersisted);
  parsePersistedRef.current = parsePersisted;

  const [snapshot, setSnapshot] = useState<Snapshot<T>>(() => {
    const seed = enabled && cacheKey ? seededEntry<T>(cacheKey, persist, parsePersisted) : undefined;
    return seed
      ? { data: seed.data, error: undefined, hasLoaded: true, isRefreshing: false, at: seed.at }
      : { ...LOADING };
  });

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
        persist: persistRef.current,
        parsePersisted: parsePersistedRef.current,
      },
      (signal) => fetcherRef.current(signal),
    );
    resourceRef.current = resource;
    setSnapshot(resource.getSnapshot());
    const unsubscribe = resource.subscribe(setSnapshot);
    return () => {
      resourceRef.current = null;
      unsubscribe();
    };
  }, [key, cacheKey, enabled, staleMs, intervalMs, refreshKey]);

  const refresh = useCallback(() => {
    resourceRef.current?.refresh();
  }, []);

  let state: PolledResourceState<T>;
  if (!snapshot.hasLoaded) {
    state = snapshot.error ? { status: "error", error: snapshot.error } : { status: "loading" };
  } else if (snapshot.data === undefined || isEmpty(snapshot.data)) {
    state = { status: "empty" };
  } else {
    state = { status: "success", data: snapshot.data };
  }

  return { state, isRefreshing: snapshot.isRefreshing, refresh };
}
