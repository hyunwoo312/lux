import type { TrendItem, TrendMovement } from "@/widgets/news/types";

export type RankMap = Record<string, number>;

export function ranksOf(items: TrendItem[]): RankMap {
  const ranks: RankMap = {};
  items.forEach((item, index) => {
    ranks[item.term] = index + 1;
  });
  return ranks;
}

export function movementFor(term: string, rank: number, previous: RankMap): TrendMovement | null {
  if (Object.keys(previous).length === 0) return null;
  const before = previous[term];
  if (before === undefined) return { kind: "new" };
  if (before > rank) return { kind: "up", places: before - rank };
  if (before < rank) return { kind: "down", places: rank - before };
  return { kind: "steady" };
}
