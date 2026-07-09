import { describe, expect, it } from "vitest";
import { dedupeUpNext } from "@/widgets/spotify/lib/queue";
import type { SpotifyQueueItem } from "@/widgets/spotify/types";

function item(id: string): SpotifyQueueItem {
  return { id, uri: `spotify:track:${id}`, title: id, subtitle: "" };
}

describe("dedupeUpNext", () => {
  it("collapses a single track the queue endpoint floods to nothing", () => {
    const queue = [item("a"), item("a"), item("a")];
    expect(dedupeUpNext(queue, "a")).toEqual([]);
  });

  it("drops the current track and de-duplicates repeats while preserving order", () => {
    const queue = [item("a"), item("b"), item("a"), item("c"), item("b")];
    expect(dedupeUpNext(queue, "a").map((entry) => entry.id)).toEqual(["b", "c"]);
  });

  it("returns distinct upcoming tracks unchanged", () => {
    const queue = [item("b"), item("c")];
    expect(dedupeUpNext(queue, "a")).toEqual([item("b"), item("c")]);
  });

  it("handles an empty queue", () => {
    expect(dedupeUpNext([], "a")).toEqual([]);
  });
});
