import {
  getNextSequentialIndex,
  getRandomIndexExcluding,
  getSignature,
  selectNewtabIndex,
} from "@/lib/media-rotation";

describe("getNextSequentialIndex", () => {
  it("advances and wraps", () => {
    expect(getNextSequentialIndex(0, 3)).toBe(1);
    expect(getNextSequentialIndex(2, 3)).toBe(0);
  });

  it("returns 0 for an empty pool", () => {
    expect(getNextSequentialIndex(0, 0)).toBe(0);
  });
});

describe("getRandomIndexExcluding", () => {
  it("never returns the excluded index when others exist", () => {
    for (let run = 0; run < 50; run += 1) {
      expect(getRandomIndexExcluding(4, 2)).not.toBe(2);
    }
  });

  it("returns 0 for a single-image pool", () => {
    expect(getRandomIndexExcluding(1, 0)).toBe(0);
  });
});

describe("selectNewtabIndex", () => {
  it("consumes the stored queue in order and records the next state", () => {
    const ids = ["a", "b", "c"];
    const signature = `shuffle:${getSignature(ids)}`;
    const stored = { signature, queue: ["b", "c"], last: "a" };

    const { index, next } = selectNewtabIndex(ids, stored);

    expect(index).toBe(1);
    expect(next).toEqual({ signature, queue: ["c"], last: "b" });
  });

  it("builds the queue in list order after the last shown item when sequential", () => {
    const ids = ["a", "b", "c"];
    const signature = `sequential:${getSignature(ids)}`;
    const stored = { signature, queue: [], last: "b" };

    const { index, next } = selectNewtabIndex(ids, stored, "sequential");

    expect(index).toBe(2);
    expect(next).toEqual({ signature, queue: ["a", "b"], last: "c" });
  });

  it("rebuilds the queue when the order mode changes", () => {
    const ids = ["a", "b", "c"];
    const stored = { signature: `shuffle:${getSignature(ids)}`, queue: ["c"], last: "b" };

    const { index, next } = selectNewtabIndex(ids, stored, "sequential");

    expect(index).toBe(2);
    expect(next).toEqual({
      signature: `sequential:${getSignature(ids)}`,
      queue: ["a", "b"],
      last: "c",
    });
  });

  it("reshuffles into a full permutation when the signature changes", () => {
    const ids = ["a", "b", "c"];
    const { index, next } = selectNewtabIndex(ids, {
      signature: "stale",
      queue: ["x"],
      last: null,
    });

    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(ids.length);
    expect(next.queue).toHaveLength(ids.length - 1);
    expect(ids).toContain(next.last);
  });

  it("handles an empty pool", () => {
    const { index, next } = selectNewtabIndex([], null);
    expect(index).toBe(0);
    expect(next).toEqual({ signature: "shuffle:", queue: [], last: null });
  });
});
