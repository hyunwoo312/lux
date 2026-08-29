import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { RefObject } from "react";
import { PAGED_CACHE_PREFIX, POLLED_CACHE_PREFIX, setLocal } from "@/lib/local-store";
import { RateLimitError } from "@/lib/net";
import { refreshScheduler } from "@/widgets/core/refreshScheduler";
import { useScaledCadence } from "@/widgets/core/useWidgetRefreshScale";

export const RETRY_BASE_MS = 60_000;
const RETRY_MAX_MS = 30 * 60_000;
const DEFAULT_STALE_MS = 180_000;

export function retryDelayMs(error: Error, failureCount: number): number {
  if (error instanceof RateLimitError && error.retryAfterMs > 0) return error.retryAfterMs;
  return backoffDelayMs(failureCount) + Math.random() * RETRY_BASE_MS;
}

export function backoffDelayMs(failureCount: number): number {
  if (failureCount <= 0) return 0;
  return Math.min(RETRY_BASE_MS * 2 ** (failureCount - 1), RETRY_MAX_MS);
}

export type Scope = "polled" | "paged";

const SCOPES: readonly Scope[] = ["polled", "paged"];

const CACHE_PREFIX: Record<Scope, string> = {
  polled: POLLED_CACHE_PREFIX,
  paged: PAGED_CACHE_PREFIX,
};

export type Mode = "initial" | "refresh" | "more";

export type Snapshot<D> = {
  data: D;
  error: Error | undefined;
  hasLoaded: boolean;
  pending: Mode | null;
  at: number;
  refreshError: Error | undefined;
  failureCount: number;
};

export type CacheEntry<D> = { data: D; at: number };

export type Decode<D> = (raw: unknown) => CacheEntry<D> | undefined;
export type Encode<D> = (data: D, at: number) => unknown;

export function seedSnapshot<D>(entry: CacheEntry<D> | undefined, blank: () => D): Snapshot<D> {
  return {
    data: entry ? entry.data : blank(),
    error: undefined,
    hasLoaded: entry !== undefined,
    pending: null,
    at: entry ? entry.at : 0,
    refreshError: undefined,
    failureCount: 0,
  };
}

const caches: Record<Scope, Map<string, CacheEntry<unknown>>> = {
  polled: new Map(),
  paged: new Map(),
};

function readPersisted<D>(
  scope: Scope,
  cacheKey: string,
  decode: Decode<D>,
): CacheEntry<D> | undefined {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX[scope] + cacheKey);
    return raw === null ? undefined : decode(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

function removePersisted(scope: Scope, cacheKey: string): void {
  try {
    localStorage.removeItem(CACHE_PREFIX[scope] + cacheKey);
  } catch {
    return;
  }
}

export function hasPersisted(scope: Scope, cacheKey: string): boolean {
  try {
    return localStorage.getItem(CACHE_PREFIX[scope] + cacheKey) !== null;
  } catch {
    return false;
  }
}

export function seededEntry<D>(
  scope: Scope,
  cacheKey: string,
  persist: boolean,
  decode: Decode<D>,
): CacheEntry<D> | undefined {
  const cache = caches[scope];
  const cached = cache.get(cacheKey) as CacheEntry<D> | undefined;
  if (cached || !persist) return cached;
  const stored = readPersisted<D>(scope, cacheKey, decode);
  if (stored) cache.set(cacheKey, stored);
  return stored;
}

export function peekEntry<D>(scope: Scope, cacheKey: string): CacheEntry<D> | undefined {
  return caches[scope].get(cacheKey) as CacheEntry<D> | undefined;
}

export function storeEntry<D>(
  scope: Scope,
  cacheKey: string,
  entry: CacheEntry<D>,
  persist: boolean,
  encode: Encode<D>,
): void {
  caches[scope].set(cacheKey, entry);
  if (persist) {
    setLocal(CACHE_PREFIX[scope] + cacheKey, JSON.stringify(encode(entry.data, entry.at)));
  }
}

export function dropEntry(scope: Scope, cacheKey: string): void {
  caches[scope].delete(cacheKey);
  removePersisted(scope, cacheKey);
}

function stalePersisted(scope: Scope, cacheKey: string): void {
  const key = CACHE_PREFIX[scope] + cacheKey;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return;
    const stored: unknown = JSON.parse(raw);
    if (typeof stored !== "object" || stored === null || Array.isArray(stored)) return;
    setLocal(key, JSON.stringify({ ...stored, at: 0 }));
  } catch {
    return;
  }
}

function staleEntry(scope: Scope, cacheKey: string): void {
  const entry = caches[scope].get(cacheKey);
  if (entry) caches[scope].set(cacheKey, { ...entry, at: 0 });
  stalePersisted(scope, cacheKey);
}

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

export function staleSinceOf(freshness: Freshness): number | undefined {
  return freshness.status === "failing" ? freshness.since : undefined;
}

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

export type ResourceIdentity = {
  key: string;
  cacheKey: string | undefined;
  scope: Scope;
  staleMs: number;
  intervalMs: number | undefined;
};

export type ResourceConfig<D> = ResourceIdentity & {
  persist: boolean;
  blank: () => D;
  decode: Decode<D>;
  encode: Encode<D>;
};

type LiveResource = {
  getSnapshot: () => Snapshot<unknown>;
  refresh: () => void;
  markStale: () => void;
};

const liveResources = new Map<string, LiveResource>();

const carriedBackoff = new Map<string, { failureCount: number; retryAt: number }>();

export abstract class SharedResource<D> {
  protected snapshot: Snapshot<D>;
  private readonly listeners = new Set<(snapshot: Snapshot<D>) => void>();
  private readonly cadences = new Map<object, Cadence>();
  private registered: Cadence | null = null;
  private generation = 0;
  private inFlight: Promise<void> | null = null;
  private abort: AbortController | null = null;
  private unregister: (() => void) | null = null;
  private failureCount = 0;
  private retryAt = 0;

  constructor(protected readonly config: ResourceConfig<D>) {
    const seed = config.cacheKey
      ? seededEntry<D>(config.scope, config.cacheKey, config.persist, config.decode)
      : undefined;
    this.snapshot = seedSnapshot(seed, config.blank);
    const carried = carriedBackoff.get(config.key);
    if (carried && carried.retryAt > Date.now()) {
      this.failureCount = carried.failureCount;
      this.retryAt = carried.retryAt;
    } else {
      carriedBackoff.delete(config.key);
    }
  }

  protected abstract fetchData(mode: Mode, signal: AbortSignal): Promise<D>;

  protected abstract isStorable(data: D): boolean;

  protected isDue(cadence: Cadence): boolean {
    return Date.now() - this.snapshot.at >= cadence.staleMs;
  }

  protected canPoll(): boolean {
    return true;
  }

  protected rewind(data: D): D {
    return data;
  }

  getSnapshot(): Snapshot<D> {
    return this.snapshot;
  }

  subscribe(listener: (snapshot: Snapshot<D>) => void, cadence: Cadence): () => void {
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

  refresh(): void {
    void this.run("refresh");
  }

  pollRefresh(): void {
    if (Date.now() < this.retryAt) return;
    if (!this.canPoll()) return;
    void this.run("refresh");
  }

  markStale(): void {
    this.failureCount = 0;
    this.retryAt = 0;
    this.patch({ at: 0, data: this.rewind(this.snapshot.data) });
  }

  protected patch(part: Partial<Snapshot<D>>): void {
    this.snapshot = { ...this.snapshot, ...part };
    for (const listener of this.listeners) listener(this.snapshot);
    notifyFreshness();
  }

  protected run(mode: Mode): Promise<void> {
    if (this.inFlight) {
      if (mode === "more" || this.snapshot.pending !== "more") return this.inFlight;
      this.abort?.abort();
    }
    const generation = (this.generation += 1);
    const controller = new AbortController();
    this.abort = controller;
    this.patch({ pending: mode });

    const promise = (async () => {
      try {
        const data = await this.fetchData(mode, controller.signal);
        if (generation !== this.generation) return;
        const at = Date.now();
        const { cacheKey, scope, persist, encode } = this.config;
        if (cacheKey) {
          if (this.isStorable(data)) storeEntry(scope, cacheKey, { data, at }, persist, encode);
          else dropEntry(scope, cacheKey);
        }
        this.failureCount = 0;
        this.retryAt = 0;
        this.patch({
          data,
          error: undefined,
          hasLoaded: true,
          pending: null,
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
            ? { pending: null, refreshError: error, failureCount: this.failureCount }
            : { error, pending: null, refreshError: error, failureCount: this.failureCount },
        );
      } finally {
        if (generation === this.generation) this.inFlight = null;
      }
    })();
    this.inFlight = promise;
    return promise;
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
      id: `${this.config.scope}:${this.config.key}`,
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

  private start(): void {
    const cadence = this.cadence();
    if (!this.snapshot.hasLoaded) void this.run("initial");
    else if (this.isDue(cadence) && Date.now() >= this.retryAt) void this.run("refresh");
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
    if (this.retryAt > Date.now()) {
      carriedBackoff.set(this.config.key, {
        failureCount: this.failureCount,
        retryAt: this.retryAt,
      });
    } else {
      carriedBackoff.delete(this.config.key);
    }
    liveResources.delete(this.config.key);
  }
}

const freshnessListeners = new Set<() => void>();
const freshnessCache = new Map<string, Freshness>();

function sameFreshness(a: Freshness, b: Freshness): boolean {
  if (a.status !== b.status) return false;
  if (a.status === "current" || b.status === "current") return true;
  return a.since === b.since && a.failures === b.failures;
}

function notifyFreshness(): void {
  for (const listener of freshnessListeners) listener();
}

function subscribeFreshness(onChange: () => void): () => void {
  freshnessListeners.add(onChange);
  return () => freshnessListeners.delete(onChange);
}

export function peekFreshness(prefix: string): Freshness {
  let worst: Freshness = { status: "current" };
  for (const [key, resource] of liveResources) {
    if (!key.startsWith(prefix)) continue;
    const candidate = freshnessOf(resource.getSnapshot());
    if (candidate.status !== "failing") continue;
    if (worst.status === "current" || candidate.since < worst.since) worst = candidate;
  }
  const cached = freshnessCache.get(prefix);
  if (cached && sameFreshness(cached, worst)) return cached;
  freshnessCache.set(prefix, worst);
  return worst;
}

export function useFreshness(prefix: string): Freshness {
  return useSyncExternalStore(
    subscribeFreshness,
    () => peekFreshness(prefix),
    () => peekFreshness(prefix),
  );
}

export type ResourceGroup = { isRefreshing: boolean; lastSyncedAt: number };

function readGroup(keys: readonly string[]): ResourceGroup {
  let isRefreshing = false;
  let lastSyncedAt = 0;
  for (const key of keys) {
    const snapshot = liveResources.get(key)?.getSnapshot();
    if (!snapshot) continue;
    if (snapshot.pending === "refresh") isRefreshing = true;
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

export function getResource(key: string): LiveResource | undefined {
  return liveResources.get(key);
}

export function refreshResource(key: string): void {
  liveResources.get(key)?.refresh();
}

export function invalidateResource(scope: Scope, cacheKey: string): void {
  dropEntry(scope, cacheKey);
  carriedBackoff.delete(cacheKey);
  liveResources.get(cacheKey)?.markStale();
}

export function staleResource(scope: Scope, cacheKey: string): void {
  staleEntry(scope, cacheKey);
  carriedBackoff.delete(cacheKey);
  liveResources.get(cacheKey)?.markStale();
}

export function clearResources(): void {
  for (const scope of SCOPES) {
    for (const cacheKey of [...caches[scope].keys()]) removePersisted(scope, cacheKey);
    caches[scope].clear();
  }
  liveResources.clear();
  carriedBackoff.clear();
}

function acquireResource<D, R extends SharedResource<D>>(
  key: string,
  create: () => R,
  adopt: (resource: R) => void,
): R {
  const existing = liveResources.get(key) as R | undefined;
  if (existing) {
    adopt(existing);
    return existing;
  }
  const resource = create();
  liveResources.set(key, resource);
  return resource;
}

let nextAutoKey = 0;

type ResourceParams<D, R extends SharedResource<D>> = {
  scope: Scope;
  cacheKey: string | undefined;
  enabled: boolean;
  intervalMs: number | undefined;
  staleMs: number | undefined;
  seed: () => Snapshot<D>;
  create: (identity: ResourceIdentity) => R;
  adopt: (resource: R) => void;
};

export function useResource<D, R extends SharedResource<D>>(
  params: ResourceParams<D, R>,
): { snapshot: Snapshot<D>; resource: RefObject<R | null> } {
  const { scope, cacheKey, enabled, intervalMs, staleMs: declaredStaleMs } = params;
  const { staleMs, intervalMs: scaledIntervalMs } = useScaledCadence(
    declaredStaleMs ?? intervalMs ?? DEFAULT_STALE_MS,
    intervalMs,
  );

  const autoKeyRef = useRef("");
  if (!autoKeyRef.current) autoKeyRef.current = `${scope}#${(nextAutoKey += 1)}`;
  const key = cacheKey ?? autoKeyRef.current;

  const latest = useRef(params);
  latest.current = params;

  const [snapshot, setSnapshot] = useState<Snapshot<D>>(params.seed);

  const keyRef = useRef(key);
  if (keyRef.current !== key) {
    keyRef.current = key;
    setSnapshot(latest.current.seed());
  }

  const resource = useRef<R | null>(null);

  useEffect(() => {
    if (!enabled) {
      resource.current = null;
      return;
    }
    const { create, adopt } = latest.current;
    const acquired = acquireResource<D, R>(
      key,
      () => create({ key, cacheKey, scope, staleMs, intervalMs: scaledIntervalMs }),
      adopt,
    );
    resource.current = acquired;
    setSnapshot(acquired.getSnapshot());
    const unsubscribe = acquired.subscribe(setSnapshot, { staleMs, intervalMs: scaledIntervalMs });
    return () => {
      resource.current = null;
      unsubscribe();
    };
  }, [key, cacheKey, scope, enabled, staleMs, scaledIntervalMs]);

  return { snapshot, resource };
}
