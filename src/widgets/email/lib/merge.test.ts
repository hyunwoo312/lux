import { describe, expect, it, vi } from "vitest";
import { createMerge, type SourceFetcher } from "@/widgets/email/lib/merge";

type Item = { id: string; at: number };
const at = (item: Item) => item.at;

function source(pages: Item[][]): SourceFetcher<Item> {
  return vi.fn(async (page: number) => ({
    items: pages[page - 1] ?? [],
    hasNextPage: page < pages.length,
  }));
}

const item = (id: string, day: number): Item => ({ id, at: day });

describe("merging two inboxes into one ordered list", () => {
  it("interleaves by date rather than by source", async () => {
    const merge = createMerge(
      [source([[item("g1", 10), item("g2", 8)]]), source([[item("o1", 9), item("o2", 7)]])],
      at,
    );

    const { items } = await merge.take(4);

    expect(items.map((i) => i.id)).toEqual(["g1", "o1", "g2", "o2"]);
  });

  it("fills each source to a full batch before deciding what is newest", async () => {
    const busy = source([[item("g1", 100)], [item("g2", 80)], [item("g3", 70)]]);
    const quiet = source([[item("o1", 50)]]);
    const merge = createMerge([busy, quiet], at);

    await merge.take(2);
    const second = await merge.take(2);

    expect(second.items.map((i) => i.id)).toEqual(["g3", "o1"]);
  });

  it("waits for a page it has not fetched rather than emitting an older message early", async () => {
    const busy = source([[item("g1", 100)], [item("g2", 80)]]);
    const quiet = source([[item("o1", 50)]]);
    const merge = createMerge([busy, quiet], at);

    const { items } = await merge.take(2);

    expect(items.map((i) => i.id)).toEqual(["g1", "g2"]);
  });

  it("keeps pulling the busy source and leaves the quiet one buffered", async () => {
    const busy = source([
      [item("g1", 100), item("g2", 99)],
      [item("g3", 98), item("g4", 97)],
      [item("g5", 96), item("g6", 95)],
    ]);
    const quiet = source([[item("o1", 5)]]);
    const merge = createMerge([busy, quiet], at);

    await merge.take(2);
    const second = await merge.take(2);

    expect(second.items.map((i) => i.id)).toEqual(["g3", "g4"]);
    expect(quiet).toHaveBeenCalledTimes(1);
  });

  it("emits the quiet source's messages once the busy one is exhausted", async () => {
    const busy = source([[item("g1", 100)]]);
    const quiet = source([[item("o1", 5)]]);
    const merge = createMerge([busy, quiet], at);

    const { items, hasNextPage } = await merge.take(10);

    expect(items.map((i) => i.id)).toEqual(["g1", "o1"]);
    expect(hasNextPage).toBe(false);
  });

  it("never emits the same message twice across batches", async () => {
    const merge = createMerge(
      [
        source([[item("g1", 10), item("g2", 8)], [item("g3", 6)]]),
        source([[item("o1", 9), item("o2", 7)]]),
      ],
      at,
    );

    const seen = [...(await merge.take(2)).items, ...(await merge.take(2)).items];
    seen.push(...(await merge.take(2)).items);

    expect(new Set(seen.map((i) => i.id)).size).toBe(seen.length);
  });
});

describe("when one inbox is unreachable", () => {
  const fails = (message: string): SourceFetcher<Item> =>
    vi.fn(() => Promise.reject(new Error(message)));

  it("still shows the inbox that answered, and names the one that did not", async () => {
    const merge = createMerge([fails("Gmail is down"), source([[item("o1", 9)]])], at);

    const { items, failures } = await merge.take(2);

    expect(items.map((i) => i.id)).toEqual(["o1"]);
    expect(failures[0]?.message).toBe("Gmail is down");
    expect(failures[1]).toBeUndefined();
  });

  it("throws when every source failed, so the widget can offer a retry", async () => {
    const merge = createMerge([fails("down"), fails("also down")], at);

    await expect(merge.take(2)).rejects.toThrow("down");
  });

  it("propagates an abort instead of reporting an empty inbox", async () => {
    const aborted: SourceFetcher<Item> = () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      return Promise.reject(error);
    };
    const merge = createMerge([aborted, source([[item("o1", 9)]])], at);

    await expect(merge.take(2)).rejects.toThrow("aborted");
  });
});
