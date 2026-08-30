import { useCallback, useRef } from "react";
import {
  SharedResource,
  freshnessOf,
  readResource,
  getResource,
  hasPersisted,
  invalidateResource,
  peekEntry,
  refreshResource,
  seedSnapshot,
  seededEntry,
  staleResource,
  storeEntry,
  useResource,
  type Decode,
  type Freshness,
  type Mode,
  type ResourceConfig,
  type Snapshot,
} from "@/widgets/core/sharedResource";

export {
  RETRY_BASE_MS,
  backoffDelayMs,
  clearResources as clearPolledResources,
  effectiveCadence,
  freshnessOf,
  peekFreshness,
  retryDelayMs,
  staleSinceOf,
  useFreshness,
  useResourceGroup,
  type Cadence,
  type Freshness,
  type ResourceGroup,
} from "@/widgets/core/sharedResource";

export type PolledResourceState<T> =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "empty" }
  | { status: "success"; data: T };

export type PolledResource<T> = {
  state: PolledResourceState<T>;
  isRefreshing: boolean;
  lastSyncedAt: number;
  freshness: Freshness;
  refresh: () => void;
};

type Fetcher<T> = (signal: AbortSignal) => Promise<T>;

type Options<T> = {
  enabled?: boolean;
  intervalMs?: number;
  staleMs?: number;
  isEmpty?: (data: T) => boolean;
  cacheKey?: string;
  persist?: boolean;
  parsePersisted?: (raw: unknown) => T | null;
};

function defaultIsEmpty(data: unknown): boolean {
  return data == null || (Array.isArray(data) && data.length === 0);
}

const blank = (): undefined => undefined;

function encodePolled(data: unknown, at: number): unknown {
  return { data, at };
}

function decodePolled<T>(parse?: (raw: unknown) => T | null): Decode<T> {
  return (raw) => {
    const entry = raw as { data: unknown; at: unknown } | null;
    if (typeof entry?.at !== "number") return undefined;
    const data = parse ? parse(entry.data) : (entry.data as T);
    if (data == null) return undefined;
    return { data, at: entry.at };
  };
}

class PolledSource<T> extends SharedResource<T | undefined> {
  constructor(
    config: ResourceConfig<T | undefined>,
    private fetcher: Fetcher<T>,
  ) {
    super(config);
  }

  setFetcher(fetcher: Fetcher<T>): void {
    this.fetcher = fetcher;
  }

  applyPatch(update: (data: T) => T): void {
    if (!this.snapshot.hasLoaded || this.snapshot.data === undefined) return;
    const data = update(this.snapshot.data);
    const { cacheKey, scope, persist, encode } = this.config;
    if (cacheKey) storeEntry(scope, cacheKey, { data, at: this.snapshot.at }, persist, encode);
    this.patch({ data });
  }

  protected fetchData(_mode: Mode, signal: AbortSignal): Promise<T | undefined> {
    return this.fetcher(signal);
  }

  protected isStorable(): boolean {
    return true;
  }
}

export type PolledDefinition<T> = {
  cacheKey: string;
  intervalMs: number;
  staleMs?: number;
  parse: (raw: unknown) => T | null;
  fetch: Fetcher<T>;
};

export function usePolledDefinition<T>(
  definition: PolledDefinition<T>,
  options: { enabled?: boolean; isEmpty?: (data: T) => boolean; intervalMs?: number } = {},
): PolledResource<T> {
  return usePolledResource(definition.fetch, {
    enabled: options.enabled,
    isEmpty: options.isEmpty,
    intervalMs: options.intervalMs ?? definition.intervalMs,
    staleMs: definition.staleMs,
    cacheKey: definition.cacheKey,
    persist: true,
    parsePersisted: definition.parse,
  });
}

export async function readPolled<T>(definition: PolledDefinition<T>): Promise<T> {
  const data = await readResource<T | undefined, PolledSource<T>>(
    definition.cacheKey,
    () =>
      new PolledSource<T>(
        {
          key: definition.cacheKey,
          cacheKey: definition.cacheKey,
          scope: "polled",
          staleMs: definition.staleMs ?? definition.intervalMs,
          intervalMs: definition.intervalMs,
          persist: true,
          blank,
          decode: decodePolled(definition.parse),
          encode: encodePolled,
        },
        definition.fetch,
      ),
  );
  if (data === undefined) throw new Error("That request came back with nothing.");
  return data;
}

export function peekPolledResource<T>(cacheKey: string): T | undefined {
  return peekEntry<T>("polled", cacheKey)?.data;
}

export function patchPolledResource<T>(cacheKey: string, update: (data: T) => T): void {
  const live = getResource(cacheKey);
  if (live instanceof PolledSource) {
    (live as PolledSource<T>).applyPatch(update);
    return;
  }
  const entry = peekEntry<T>("polled", cacheKey);
  if (!entry) return;
  storeEntry(
    "polled",
    cacheKey,
    { data: update(entry.data), at: entry.at },
    hasPersisted("polled", cacheKey),
    encodePolled,
  );
}

export function refreshPolledResource(cacheKey: string): void {
  refreshResource(cacheKey);
}

export function invalidatePolledResource(cacheKey: string): void {
  invalidateResource("polled", cacheKey);
}

export function stalePolledResource(cacheKey: string): void {
  staleResource("polled", cacheKey);
}

export function usePolledResource<T>(
  fetcher: Fetcher<T>,
  options: Options<T> = {},
): PolledResource<T> {
  const {
    enabled = true,
    intervalMs,
    staleMs,
    isEmpty = defaultIsEmpty,
    cacheKey,
    persist = false,
    parsePersisted,
  } = options;

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const call = useCallback<Fetcher<T>>((signal) => fetcherRef.current(signal), []);

  const { snapshot, resource } = useResource<T | undefined, PolledSource<T>>({
    scope: "polled",
    cacheKey,
    enabled,
    intervalMs,
    staleMs,
    seed: (): Snapshot<T | undefined> =>
      seedSnapshot(
        enabled && cacheKey
          ? seededEntry<T | undefined>("polled", cacheKey, persist, decodePolled(parsePersisted))
          : undefined,
        blank,
      ),
    create: (identity) =>
      new PolledSource<T>(
        { ...identity, persist, blank, decode: decodePolled(parsePersisted), encode: encodePolled },
        call,
      ),
    adopt: (existing) => existing.setFetcher(call),
  });

  const refresh = useCallback(() => {
    resource.current?.refresh();
  }, [resource]);

  let state: PolledResourceState<T>;
  if (!snapshot.hasLoaded) {
    state = snapshot.error ? { status: "error", error: snapshot.error } : { status: "loading" };
  } else if (snapshot.data === undefined || isEmpty(snapshot.data)) {
    state = { status: "empty" };
  } else {
    state = { status: "success", data: snapshot.data };
  }

  return {
    state,
    isRefreshing: snapshot.pending === "refresh",
    lastSyncedAt: snapshot.at,
    freshness: freshnessOf(snapshot),
    refresh,
  };
}
