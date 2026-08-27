import { describe, expect, it } from "vitest";
import { movementFor, ranksOf } from "@/widgets/news/lib/trend-movement";
import type { TrendItem } from "@/widgets/news/types";

function item(term: string): TrendItem {
  return {
    term,
    trafficLabel: "200+",
    imageUrl: null,
    news: [],
  };
}

describe("ranksOf", () => {
  it("numbers the list from one", () => {
    expect(ranksOf([item("a"), item("b")])).toEqual({ a: 1, b: 2 });
  });
});

describe("movementFor", () => {
  const previous = { a: 3, b: 1 };

  it("says nothing at all on the very first load", () => {
    expect(movementFor("a", 1, {})).toBeNull();
  });

  it("marks a term that was not there before as new", () => {
    expect(movementFor("z", 4, previous)).toEqual({ kind: "new" });
  });

  it("counts the places a term climbed", () => {
    expect(movementFor("a", 1, previous)).toEqual({ kind: "up", places: 2 });
  });

  it("counts the places a term slipped", () => {
    expect(movementFor("b", 4, previous)).toEqual({ kind: "down", places: 3 });
  });

  it("says a term held its place", () => {
    expect(movementFor("b", 1, previous)).toEqual({ kind: "steady" });
  });
});
