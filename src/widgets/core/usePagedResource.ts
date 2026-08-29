import { useCallback, useRef } from "react";
import {
  SharedResource,
  freshnessOf,
  seedSnapshot,
  seededEntry,
  staleResource,
  useResource,
  type Cadence,
  type Decode,
  type Freshness,
  type Mode,
  type ResourceConfig,
  type Snapshot,
} from "@/widgets/core/sharedResource";

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
  lastSyncedAt: number;
  freshness: Freshness;
  loadMore: () => void;
  refresh: () => void;
};

type Options<T> = {
  enabled?: boolean;
  intervalMs?: number;
  staleMs?: number;
  maxItems: number;
  cacheKey?: string;
  getKey: (item: T) => string | number;
  persist?: boolean;
  resumePaging?: boolean;
  parsePersisted?: (raw: unknown) => T[] | null;
};

type PagedData<T> = { items: T[]; page: number; hasNextPage: boolean };

type Paging<T> = {
  maxItems: number;
  resumePaging: boolean;
  getKey: (item: T) => string | number;
};

const blank = <T>(): PagedData<T> => ({ items: [], page: 0, hasNextPage: false });

function encodePaged(data: unknown, at: number): unknown {
  return { ...(data as PagedData<unknown>), at };
}

function decodePaged<T>(parse?: (raw: unknown) => T[] | null): Decode<PagedData<T>> {
  return (raw) => {
    const entry = raw as {
      items: unknown;
      page: unknown;
      hasNextPage: unknown;
      at: unknown;
    } | null;
    if (
      typeof entry?.at !== "number" ||
      typeof entry.page !== "number" ||
      typeof entry.hasNextPage !== "boolean"
    ) {
      return undefined;
    }
    const items = parse ? parse(entry.items) : (entry.items as T[]);
    if (!items || items.length === 0) return undefined;
    return {
      data: { items, page: entry.page, hasNextPage: entry.hasNextPage },
      at: entry.at,
    };
  };
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

class PagedSource<T> extends SharedResource<PagedData<T>> {
  constructor(
    config: ResourceConfig<PagedData<T>>,
    private readonly paging: Paging<T>,
    private fetcher: PagedFetcher<T>,
  ) {
    super(config);
  }

  setFetcher(fetcher: PagedFetcher<T>): void {
    this.fetcher = fetcher;
  }

  loadMore(): void {
    if (!this.snapshot.data.hasNextPage) return;
    void this.run("more");
  }

  protected async fetchData(mode: Mode, signal: AbortSignal): Promise<PagedData<T>> {
    const page = mode === "more" ? this.snapshot.data.page + 1 : 1;
    const result = await this.fetcher(page, signal);
    const merged =
      mode === "more"
        ? dedupe([...this.snapshot.data.items, ...result.items], this.paging.getKey)
        : result.items;
    return {
      items: merged.slice(0, this.paging.maxItems),
      page,
      hasNextPage: result.hasNextPage,
    };
  }

  protected isStorable(data: PagedData<T>): boolean {
    return data.items.length > 0;
  }

  protected override isDue(cadence: Cadence): boolean {
    return !this.paging.resumePaging || super.isDue(cadence);
  }

  protected override canPoll(): boolean {
    return this.snapshot.data.page <= 1;
  }

  protected override rewind(data: PagedData<T>): PagedData<T> {
    return data.page > 1 ? { ...data, page: 1 } : data;
  }
}

export function stalePagedResource(cacheKey: string): void {
  staleResource("paged", cacheKey);
}

export function usePagedResource<T>(
  fetcher: PagedFetcher<T>,
  {
    enabled = true,
    intervalMs,
    staleMs,
    maxItems,
    cacheKey,
    getKey,
    persist = false,
    resumePaging = true,
    parsePersisted,
  }: Options<T>,
): PagedResource<T> {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const call = useCallback<PagedFetcher<T>>((page, signal) => fetcherRef.current(page, signal), []);

  const pagingRef = useRef<Paging<T>>({ maxItems, resumePaging, getKey });
  pagingRef.current = { maxItems, resumePaging, getKey };

  const { snapshot, resource } = useResource<PagedData<T>, PagedSource<T>>({
    scope: "paged",
    cacheKey,
    enabled,
    intervalMs,
    staleMs,
    seed: (): Snapshot<PagedData<T>> => {
      const entry =
        enabled && cacheKey
          ? seededEntry<PagedData<T>>("paged", cacheKey, persist, decodePaged(parsePersisted))
          : undefined;
      const seeded =
        entry && !resumePaging
          ? { data: { ...entry.data, page: 1, hasNextPage: true }, at: entry.at }
          : entry;
      return seedSnapshot(seeded, blank<T>);
    },
    create: (identity) =>
      new PagedSource<T>(
        {
          ...identity,
          persist,
          blank: blank<T>,
          decode: decodePaged(parsePersisted),
          encode: encodePaged,
        },
        pagingRef.current,
        call,
      ),
    adopt: (existing) => existing.setFetcher(call),
  });

  const hasMore = snapshot.data.hasNextPage && snapshot.data.items.length < maxItems;

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    resource.current?.loadMore();
  }, [hasMore, resource]);

  const refresh = useCallback(() => {
    resource.current?.refresh();
  }, [resource]);

  let state: PagedResourceState<T>;
  if (!snapshot.hasLoaded) {
    state = snapshot.error ? { status: "error", error: snapshot.error } : { status: "loading" };
  } else if (snapshot.data.items.length === 0) {
    state = { status: "empty" };
  } else {
    state = { status: "success", items: snapshot.data.items };
  }

  return {
    state,
    hasMore,
    isLoadingMore: snapshot.pending === "more",
    isRefreshing: snapshot.pending === "refresh",
    lastSyncedAt: snapshot.at,
    freshness: freshnessOf(snapshot),
    loadMore,
    refresh,
  };
}
