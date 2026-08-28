import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useScaledCadence } from "@/widgets/core/useWidgetRefreshScale";
import { POLLED_CACHE_PREFIX, setLocal } from "@/lib/local-store";
import { RateLimitError } from "@/lib/net";
import { refreshScheduler } from "@/widgets/core/refreshScheduler";

let nextAutoKey = 0;
const DEFAULT_STALE_MS = 180_000;
export const RETRY_BASE_MS = 60_000;
const RETRY_MAX_MS = 30 * 60_000;

export function retryDelayMs(error: Error, failureCount: number): number {
  if (error instanceof RateLimitError && error.retryAfterMs > 0) return error.retryAfterMs;
  return backoffDelayMs(failureCount) + Math.random() * RETRY_BASE_MS;
}

export function backoffDelayMs(failureCount: number): number {
  if (failureCount <= 0) return 0;
  return Math.min(RETRY_BASE_MS * 2 ** (failureCount - 1), RETRY_MAX_MS);
}

export type PolledResourceState<T> =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "empty" }
  | { status: "success"; data: T };

export type Freshness =
  | { status: "current" }
  | { status: "failing"; error: Error; failures: number; since: number };

export function freshnessOf(snapshot: {
  hasLoaded: boolean;
  refreshError: Error | undefined;
  failureCount: number;
  at: number;
}): Freshness {
  return snapshot.hasLoaded && snapshot.refreshError
    ? {
        status: "failing",
        error: snapshot.refreshError,
        failures: snapshot.failureCount,
        since: snapshot.at,
      }
    : { status: "current" };
}

export type PolledResource<T> = {
  state: PolledResourceState<T>;
  isRefreshing: boolean;
  lastSyncedAt: number;
  freshness: Freshness;
  refresh: () => void;
};

type Options<T> = {
  enabled?: boolean;
  intervalMs?: number;
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
  refreshError: Error | undefined;
  failureCount: number;
};

const LOADING: Snapshot<never> = {
  data: undefined,
  error: undefined,
  hasLoaded: false,
  isRefreshing: false,
  at: 0,
  refreshError: undefined,
  failureCount: 0,
};

function seedSnapshot<T>(
  enabled: boolean,
  cacheKey: string | undefined,
  persist: boolean,
  parsePersisted?: (raw: unknown) => T | null,
): Snapshot<T> {
  const seed = enabled && cacheKey ? seededEntry<T>(cacheKey, persist, parsePersisted) : undefined;
  return seed
    ? {
        data: seed.data,
        error: undefined,
        hasLoaded: true,
        isRefreshing: false,
        at: seed.at,
        refreshError: undefined,
        failureCount: 0,
      }
    : { ...LOADING };
}

type CacheEntry<T> = { data: T; at: number };

const dataCache = new Map<string, CacheEntry<unknown>>();

function storeEntry<T>(cacheKey: string, entry: CacheEntry<T>, persist: boolean): void {
  dataCache.set(cacheKey, entry);
  if (persist) writePersisted(cacheKey, entry);
}

function readPersisted<T>(
  cacheKey: string,
  parse?: (raw: unknown) => T | null,
): CacheEntry<T> | undefined {
  try {
    const raw = localStorage.getItem(POLLED_CACHE_PREFIX + cacheKey);
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
  setLocal(POLLED_CACHE_PREFIX + cacheKey, JSON.stringify(entry));
}

function hasPersisted(cacheKey: string): boolean {
  try {
    return localStorage.getItem(POLLED_CACHE_PREFIX + cacheKey) !== null;
  } catch {
    return false;
  }
}

function removePersisted(cacheKey: string): void {
  try {
    localStorage.removeItem(POLLED_CACHE_PREFIX + cacheKey);
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

export type Cadence = { staleMs: number; intervalMs?: number };

export function effectiveCadence(cadences: Iterable<Cadence>, fallback: Cadence): Cadence {
  let staleMs = Number.POSITIVE_INFINITY;
  let intervalMs: number | undefined;
  let seen = false;
  for (const cadence of cadences) {
    seen = true;
    staleMs = Math.min(staleMs, cadence.staleMs);
    if (cadence.intervalMs !== undefined && cadence.intervalMs > 0) {
      intervalMs =
        intervalMs === undefined ? cadence.intervalMs : Math.min(intervalMs, cadence.intervalMs);
    }
  }
  return seen ? { staleMs, intervalMs } : fallback;
}

class SharedResource<T> {
  private snapshot: Snapshot<T>;
  private readonly listeners = new Set<(snapshot: Snapshot<T>) => void>();
  private fetcher: (signal: AbortSignal) => Promise<T>;
  private readonly cadences = new Map<object, Cadence>();
  private registered: Cadence | null = null;
  private generation = 0;
  private inFlight: Promise<void> | null = null;
  private abort: AbortController | null = null;
  private unregister: (() => void) | null = null;
  private failureCount = 0;
  private retryAt = 0;

  constructor(
    private readonly config: ResourceConfig<T>,
    fetcher: (signal: AbortSignal) => Promise<T>,
  ) {
    this.fetcher = fetcher;
    const seed = config.cacheKey
      ? seededEntry<T>(config.cacheKey, config.persist, config.parsePersisted)
      : undefined;
    this.snapshot = seed
      ? {
          data: seed.data,
          error: undefined,
          hasLoaded: true,
          isRefreshing: false,
          at: seed.at,
          refreshError: undefined,
          failureCount: 0,
        }
      : { ...LOADING };
  }

  getSnapshot(): Snapshot<T> {
    return this.snapshot;
  }

  setFetcher(fetcher: (signal: AbortSignal) => Promise<T>): void {
    this.fetcher = fetcher;
  }

  subscribe(listener: (snapshot: Snapshot<T>) => void, cadence: Cadence): () => void {
    const token = {};
    this.listeners.add(listener);
    this.cadences.set(token, cadence);
    if (this.cadences.size === 1) this.start();
    else this.syncCadence();
    return () => {
      this.listeners.delete(listener);
      this.cadences.delete(token);
      if (this.cadences.size === 0) this.stop();
      else this.syncCadence();
    };
  }

  private cadence(): Cadence {
    return effectiveCadence(this.cadences.values(), {
      staleMs: this.config.staleMs,
      intervalMs: this.config.intervalMs,
    });
  }

  private syncCadence(): void {
    const next = this.cadence();
    if (
      this.registered &&
      this.registered.staleMs === next.staleMs &&
      this.registered.intervalMs === next.intervalMs
    ) {
      return;
    }
    this.unregister?.();
    this.register(next);
  }

  private register(cadence: Cadence): void {
    this.registered = cadence;
    this.unregister = refreshScheduler.register({
      id: `polled:${this.config.key}`,
      staleMs: cadence.staleMs,
      pollIntervalMs:
        cadence.intervalMs !== undefined && cadence.intervalMs > 0 ? cadence.intervalMs : undefined,
      getLastRefreshedAt: () => this.snapshot.at,
      refresh: () => this.pollRefresh(),
      clearBackoff: () => {
        this.failureCount = 0;
        this.retryAt = 0;
      },
    });
  }

  refresh(): void {
    void this.run(true);
  }

  private pollRefresh(): void {
    if (Date.now() < this.retryAt) return;
    void this.run(true);
  }

  markStale(): void {
    this.failureCount = 0;
    this.retryAt = 0;
    this.patch({ at: 0 });
  }

  applyPatch(update: (data: T) => T): void {
    if (!this.snapshot.hasLoaded || this.snapshot.data === undefined) return;
    const data = update(this.snapshot.data);
    if (this.config.cacheKey) {
      storeEntry(this.config.cacheKey, { data, at: this.snapshot.at }, this.config.persist);
    }
    this.patch({ data });
  }

  private patch(part: Partial<Snapshot<T>>): void {
    this.snapshot = { ...this.snapshot, ...part };
    for (const listener of this.listeners) listener(this.snapshot);
    notifyFreshness();
  }

  private start(): void {
    const cadence = this.cadence();
    if (!this.snapshot.hasLoaded) void this.run(false);
    else if (Date.now() - this.snapshot.at >= cadence.staleMs) void this.run(true);
    this.register(cadence);
  }

  private stop(): void {
    this.generation += 1;
    this.abort?.abort();
    this.abort = null;
    this.unregister?.();
    this.unregister = null;
    this.registered = null;
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
          storeEntry(this.config.cacheKey, { data, at }, this.config.persist);
        }
        this.failureCount = 0;
        this.retryAt = 0;
        this.patch({
          data,
          error: undefined,
          hasLoaded: true,
          isRefreshing: false,
          at,
          refreshError: undefined,
          failureCount: 0,
        });
      } catch (caught) {
        if (generation !== this.generation) return;
        const error = caught instanceof Error ? caught : new Error("Request failed");
        this.failureCount += 1;
        this.retryAt = Date.now() + retryDelayMs(error, this.failureCount);
        this.patch(
          this.snapshot.hasLoaded
            ? { isRefreshing: false, refreshError: error, failureCount: this.failureCount }
            : { error, isRefreshing: false, refreshError: error, failureCount: this.failureCount },
        );
      } finally {
        this.inFlight = null;
      }
    })();
    this.inFlight = promise;
    return promise;
  }
}

const freshnessListeners = new Set<() => void>();
const freshnessCache = new Map<string, Freshness>();

export type FreshnessSource = (prefix: string) => Freshness[];

const freshnessSources = new Set<FreshnessSource>();

export function registerFreshnessSource(source: FreshnessSource): void {
  freshnessSources.add(source);
}

function sameFreshness(a: Freshness, b: Freshness): boolean {
  if (a.status !== b.status) return false;
  if (a.status === "current" || b.status === "current") return true;
  return a.since === b.since && a.failures === b.failures;
}

export function notifyFreshness(): void {
  for (const listener of freshnessListeners) listener();
}

function subscribeFreshness(onChange: () => void): () => void {
  freshnessListeners.add(onChange);
  return () => freshnessListeners.delete(onChange);
}

function ownFreshness(prefix: string): Freshness[] {
  const candidates: Freshness[] = [];
  for (const [key, resource] of liveResources) {
    if (key.startsWith(prefix)) candidates.push(freshnessOf(resource.getSnapshot()));
  }
  return candidates;
}

export function peekFreshness(prefix: string): Freshness {
  let worst: Freshness = { status: "current" };
  for (const source of [ownFreshness, ...freshnessSources]) {
    for (const candidate of source(prefix)) {
      if (candidate.status !== "failing") continue;
      if (worst.status === "current" || candidate.since < worst.since) worst = candidate;
    }
  }
  const cached = freshnessCache.get(prefix);
  if (cached && sameFreshness(cached, worst)) return cached;
  freshnessCache.set(prefix, worst);
  return worst;
}

export type ResourceGroup = { isRefreshing: boolean; lastSyncedAt: number };

function readGroup(keys: readonly string[]): ResourceGroup {
  let isRefreshing = false;
  let lastSyncedAt = 0;
  for (const key of keys) {
    const snapshot = liveResources.get(key)?.getSnapshot();
    if (!snapshot) continue;
    if (snapshot.isRefreshing) isRefreshing = true;
    if (snapshot.at > lastSyncedAt) lastSyncedAt = snapshot.at;
  }
  return { isRefreshing, lastSyncedAt };
}

export function useResourceGroup(keys: readonly string[]): ResourceGroup {
  const id = keys.join("\u0000");
  const latest = useRef(keys);
  latest.current = keys;
  const [group, setGroup] = useState(() => readGroup(keys));

  useEffect(() => {
    const update = () =>
      setGroup((current) => {
        const next = readGroup(latest.current);
        return current.isRefreshing === next.isRefreshing &&
          current.lastSyncedAt === next.lastSyncedAt
          ? current
          : next;
      });
    update();
    return subscribeFreshness(update);
  }, [id]);

  return group;
}

export function useFreshness(prefix: string): Freshness {
  return useSyncExternalStore(
    subscribeFreshness,
    () => peekFreshness(prefix),
    () => peekFreshness(prefix),
  );
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

export function peekPolledResource<T>(cacheKey: string): T | undefined {
  return (dataCache.get(cacheKey) as CacheEntry<T> | undefined)?.data;
}

export function patchPolledResource<T>(cacheKey: string, update: (data: T) => T): void {
  const live = liveResources.get(cacheKey) as SharedResource<T> | undefined;
  if (live) {
    live.applyPatch(update);
    return;
  }
  const entry = dataCache.get(cacheKey) as CacheEntry<T> | undefined;
  if (!entry) return;
  storeEntry(cacheKey, { data: update(entry.data), at: entry.at }, hasPersisted(cacheKey));
}

export function clearPolledResources(): void {
  for (const cacheKey of [...dataCache.keys()]) removePersisted(cacheKey);
  dataCache.clear();
  liveResources.clear();
}

export function refreshPolledResource(cacheKey: string): void {
  (liveResources.get(cacheKey) as SharedResource<unknown> | undefined)?.refresh();
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
    isEmpty = defaultIsEmpty,
    cacheKey,
    persist = false,
    parsePersisted,
  } = options;
  const { staleMs, intervalMs: scaledIntervalMs } = useScaledCadence(intervalMs, DEFAULT_STALE_MS);

  const autoKeyRef = useRef("");
  if (!autoKeyRef.current) autoKeyRef.current = `polled#${(nextAutoKey += 1)}`;
  const key = cacheKey ?? autoKeyRef.current;

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
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
        intervalMs: scaledIntervalMs,
        persist: persistRef.current,
        parsePersisted: parsePersistedRef.current,
      },
      (signal) => fetcherRef.current(signal),
    );
    resourceRef.current = resource;
    setSnapshot(resource.getSnapshot());
    const unsubscribe = resource.subscribe(setSnapshot, {
      staleMs,
      intervalMs: scaledIntervalMs,
    });
    return () => {
      resourceRef.current = null;
      unsubscribe();
    };
  }, [key, cacheKey, enabled, staleMs, scaledIntervalMs]);

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

  const freshness = freshnessOf(snapshot);

  return {
    state,
    isRefreshing: snapshot.isRefreshing,
    lastSyncedAt: snapshot.at,
    freshness,
    refresh,
  };
}
