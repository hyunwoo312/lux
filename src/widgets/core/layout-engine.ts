import type { LayoutItem } from "react-grid-layout";

type Box = Pick<LayoutItem, "i" | "x" | "y" | "w" | "h">;
type Position = Pick<LayoutItem, "x" | "y">;

const MIN_SEARCH_ROWS = 64;
const SEARCH_ROW_PADDING = 12;

export function getLayoutBottom(layout: readonly Box[]): number {
  return layout.reduce((bottom, item) => Math.max(bottom, item.y + item.h), 0);
}

export function collides(a: Box, b: Box): boolean {
  if (a.i === b.i) return false;
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

function clampToColumns<T extends Box>(item: T, columns: number): T {
  return { ...item, x: Math.min(Math.max(0, item.x), Math.max(0, columns - item.w)) };
}

export function clampLayout<T extends Box>(layout: readonly T[], columns: number): T[] {
  return layout.map((item) => clampToColumns(item, columns));
}

function manhattan(item: Box, candidate: Position): number {
  return Math.abs(candidate.x - item.x) + Math.abs(candidate.y - item.y);
}

function escapeCandidates(item: Box, pusher: Box, columns: number): Position[] {
  const candidates = [
    { x: pusher.x + pusher.w, y: item.y, travel: pusher.x + pusher.w - item.x },
    { x: pusher.x - item.w, y: item.y, travel: item.x + item.w - pusher.x },
    { x: item.x, y: pusher.y + pusher.h, travel: pusher.y + pusher.h - item.y },
    { x: item.x, y: pusher.y - item.h, travel: item.y + item.h - pusher.y },
  ];

  return candidates
    .sort((a, b) => a.travel - b.travel)
    .map((candidate) => ({
      x: Math.min(Math.max(0, candidate.x), Math.max(0, columns - item.w)),
      y: Math.max(0, candidate.y),
    }))
    .filter(
      (candidate, index, all) =>
        all.findIndex((other) => other.x === candidate.x && other.y === candidate.y) === index,
    );
}

function pushPosition(item: Box, pusher: Box, layout: readonly Box[], columns: number): Position {
  const others = layout.filter((other) => other.i !== item.i);
  const escape = escapeCandidates(item, pusher, columns).find(
    (position) => !others.some((other) => collides({ ...item, ...position }, other)),
  );
  return escape ?? findNearestOpenPosition(item, others, columns);
}

export function findFirstOpenPosition(
  item: Box,
  placed: readonly Box[],
  columns: number,
): Position {
  const clamped = clampToColumns(item, columns);
  const maxSearchRows = Math.max(
    MIN_SEARCH_ROWS,
    getLayoutBottom(placed) + clamped.h + SEARCH_ROW_PADDING,
  );
  for (let y = 0; y <= maxSearchRows; y += 1) {
    for (let x = 0; x <= columns - clamped.w; x += 1) {
      if (!placed.some((other) => collides({ ...clamped, x, y }, other))) {
        return { x, y };
      }
    }
  }
  return { x: 0, y: getLayoutBottom(placed) };
}

export function findNearestOpenPosition(
  item: Box,
  placed: readonly Box[],
  columns: number,
): Position {
  const clamped = clampToColumns(item, columns);
  if (!placed.some((other) => collides(clamped, other))) {
    return { x: clamped.x, y: clamped.y };
  }

  const maxSearchRows = Math.max(
    MIN_SEARCH_ROWS,
    getLayoutBottom(placed) + clamped.h + SEARCH_ROW_PADDING,
  );
  const candidates: Position[] = [];
  for (let y = 0; y <= maxSearchRows; y += 1) {
    for (let x = 0; x <= columns - clamped.w; x += 1) {
      candidates.push({ x, y });
    }
  }

  candidates.sort((first, second) => {
    const distance = manhattan(clamped, first) - manhattan(clamped, second);
    if (distance !== 0) return distance;
    return first.y - second.y || first.x - second.x;
  });

  const open = candidates.find(
    (candidate) => !placed.some((other) => collides({ ...clamped, ...candidate }, other)),
  );
  if (open) return open;

  return { x: Math.min(clamped.x, Math.max(0, columns - clamped.w)), y: getLayoutBottom(placed) };
}

function localBlockers<T extends Box>(item: T, layout: readonly T[]): T[] {
  return layout.filter((candidate) => candidate.i !== item.i && collides(item, candidate));
}

export function resolveLocalDisplacement<T extends Box>(
  layout: readonly T[],
  columns: number,
  priorityItemId: string | null,
): T[] {
  if (!priorityItemId || !layout.some((item) => item.i === priorityItemId)) {
    return clampLayout(layout, columns);
  }

  const resolved = new Map<string, T>(
    layout.map((item) => [item.i, clampToColumns(item, columns)]),
  );
  const priorityItem = resolved.get(priorityItemId)!;

  for (const blocker of localBlockers(priorityItem, [...resolved.values()])) {
    const item = resolved.get(blocker.i)!;
    const position = pushPosition(item, priorityItem, [...resolved.values()], columns);
    resolved.set(item.i, { ...item, ...position });
  }

  return layout.map((item) => resolved.get(item.i)!);
}

export function resolveLayoutCollisions<T extends Box>(
  layout: readonly T[],
  columns: number,
  priorityItemId: string | null,
): T[] {
  const order = new Map(layout.map((item, index) => [item.i, index]));
  const ordered = [...layout].sort((a, b) => {
    if (a.i === priorityItemId) return -1;
    if (b.i === priorityItemId) return 1;
    return (order.get(a.i) ?? 0) - (order.get(b.i) ?? 0);
  });

  const placed: T[] = [];
  for (const item of ordered) {
    const clamped = clampToColumns(item, columns);
    const position = findNearestOpenPosition(clamped, placed, columns);
    placed.push({ ...clamped, ...position });
  }

  return placed.sort((a, b) => (order.get(a.i) ?? 0) - (order.get(b.i) ?? 0));
}
