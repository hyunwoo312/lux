type SourcePage<T> = { items: T[]; hasNextPage: boolean };
export type SourceFetcher<T> = (page: number, signal?: AbortSignal) => Promise<SourcePage<T>>;

type MergePage<T> = SourcePage<T> & { failures: readonly (Error | undefined)[] };

type Lane<T> = {
  load: SourceFetcher<T>;
  buffer: T[];
  page: number;
  exhausted: boolean;
  error: Error | undefined;
};

const MAX_PULLS_PER_LANE = 5;

export type Merge<T> = {
  take: (count: number, signal?: AbortSignal) => Promise<MergePage<T>>;
};

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function createMerge<T>(loaders: SourceFetcher<T>[], at: (item: T) => number): Merge<T> {
  const lanes: Lane<T>[] = loaders.map((load) => ({
    load,
    buffer: [],
    page: 0,
    exhausted: false,
    error: undefined,
  }));

  async function fill(lane: Lane<T>, count: number, signal?: AbortSignal): Promise<void> {
    try {
      for (let pull = 0; lane.buffer.length < count && !lane.exhausted; pull += 1) {
        if (pull === MAX_PULLS_PER_LANE) return;
        lane.page += 1;
        const { items, hasNextPage } = await lane.load(lane.page, signal);
        lane.buffer.push(...items);
        lane.exhausted = items.length === 0 || !hasNextPage;
      }
    } catch (error) {
      if (isAbort(error)) throw error;
      lane.error = error instanceof Error ? error : new Error("Request failed");
      lane.exhausted = true;
    }
  }

  return {
    async take(count, signal) {
      await Promise.all(lanes.map((lane) => fill(lane, count, signal)));

      const failures = lanes.map((lane) => lane.error);
      const broken = failures.filter(Boolean);
      if (broken.length === lanes.length) throw broken[0]!;

      const ranked = lanes.flatMap((lane) => lane.buffer).sort((a, b) => at(b) - at(a));
      const emit = ranked.slice(0, count);
      const taken = new Set(emit);
      for (const lane of lanes) lane.buffer = lane.buffer.filter((item) => !taken.has(item));

      return {
        items: emit,
        hasNextPage: lanes.some((lane) => !lane.exhausted || lane.buffer.length > 0),
        failures,
      };
    },
  };
}
