import type { LayoutItem } from "react-grid-layout";

export type DragVector = { dx: number; dy: number };

type Box = Pick<LayoutItem, "i" | "x" | "y" | "w" | "h">;
type Position = Pick<LayoutItem, "x" | "y">;

export function getLayoutBottom(layout: readonly Box[]): number {
  return layout.reduce((bottom, item) => Math.max(bottom, item.y + item.h), 0);
}

export function collides(a: Box, b: Box): boolean {
  if (a.i === b.i) return false;
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

function overlapArea(a: Box, b: Box): number {
  const width = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return width * height;
}

function collisionRatio(a: Box, b: Box): number {
  const smallerArea = Math.min(a.w * a.h, b.w * b.h);
  return smallerArea === 0 ? 0 : overlapArea(a, b) / smallerArea;
}

function clampToColumns<T extends Box>(item: T, columns: number): T {
  return { ...item, x: Math.min(Math.max(0, item.x), Math.max(0, columns - item.w)) };
}

function primaryAxis(vector: DragVector): "x" | "y" {
  return Math.abs(vector.dx) >= Math.abs(vector.dy) ? "x" : "y";
}

function preferredSign(vector: DragVector, axis: "x" | "y"): number {
  const value = axis === "x" ? vector.dx : vector.dy;
  if (value === 0) return axis === "x" ? 1 : 0;
  return Math.sign(value);
}

function pushCandidates(item: Box, pusher: Box, columns: number, vector: DragVector): Position[] {
  const axis = primaryAxis(vector);
  const sign = preferredSign(vector, axis) || 1;
  const candidates: Position[] = [];

  if (axis === "x") {
    candidates.push({ x: sign > 0 ? pusher.x + pusher.w : pusher.x - item.w, y: item.y });
  } else {
    candidates.push({ x: item.x, y: sign > 0 ? pusher.y + pusher.h : pusher.y - item.h });
  }

  candidates.push({ x: item.x, y: pusher.y + pusher.h });
  candidates.push({ x: pusher.x, y: pusher.y + pusher.h });

  if (axis === "x") {
    candidates.push({ x: sign > 0 ? pusher.x - item.w : pusher.x + pusher.w, y: item.y });
  }

  return candidates
    .map((candidate) => ({
      x: Math.min(Math.max(0, candidate.x), Math.max(0, columns - item.w)),
      y: Math.max(0, candidate.y),
    }))
    .filter(
      (candidate, index, all) =>
        all.findIndex((other) => other.x === candidate.x && other.y === candidate.y) === index,
    );
}

function pushPosition(
  item: Box,
  pusher: Box,
  layout: readonly Box[],
  columns: number,
  vector: DragVector,
): Position {
  const candidate = pushCandidates(item, pusher, columns, vector).find(
    (position) => !collides({ ...item, ...position }, pusher),
  );
  if (candidate) return candidate;
  return findNearestOpenPosition(
    item,
    layout.filter((other) => other.i !== item.i),
    columns,
    vector,
  );
}

function directionalPenalty(item: Box, candidate: Position, vector: DragVector): number {
  const axis = primaryAxis(vector);
  const sign = preferredSign(vector, axis);
  const delta = axis === "x" ? candidate.x - item.x : candidate.y - item.y;
  if (sign === 0) return 0;
  if (Math.sign(delta) === sign) return 0;
  if (delta === 0) return 2;
  return 8;
}

function manhattan(item: Box, candidate: Position): number {
  return Math.abs(candidate.x - item.x) + Math.abs(candidate.y - item.y);
}

function perpendicularDistance(item: Box, candidate: Position, vector: DragVector): number {
  return primaryAxis(vector) === "x"
    ? Math.abs(candidate.y - item.y)
    : Math.abs(candidate.x - item.x);
}

export function findNearestOpenPosition(
  item: Box,
  placed: readonly Box[],
  columns: number,
  vector: DragVector,
): Position {
  const clamped = clampToColumns(item, columns);
  if (!placed.some((other) => collides(clamped, other))) {
    return { x: clamped.x, y: clamped.y };
  }

  const maxSearchRows = Math.max(64, getLayoutBottom(placed) + clamped.h + 12);
  const candidates: Position[] = [];
  for (let y = 0; y <= maxSearchRows; y += 1) {
    for (let x = 0; x <= columns - clamped.w; x += 1) {
      candidates.push({ x, y });
    }
  }

  candidates.sort((first, second) => {
    const penalty =
      directionalPenalty(clamped, first, vector) - directionalPenalty(clamped, second, vector);
    if (penalty !== 0) return penalty;

    const perpendicular =
      perpendicularDistance(clamped, first, vector) -
      perpendicularDistance(clamped, second, vector);
    if (perpendicular !== 0) return perpendicular;

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

function localBlockers<T extends Box>(item: T, layout: readonly T[], threshold: number): T[] {
  return layout.filter(
    (candidate) =>
      candidate.i !== item.i &&
      collides(item, candidate) &&
      collisionRatio(item, candidate) >= threshold,
  );
}

export function resolveLocalDisplacement<T extends Box>(
  layout: readonly T[],
  columns: number,
  priorityItemId: string | null,
  vector: DragVector,
): T[] {
  if (!priorityItemId || !layout.some((item) => item.i === priorityItemId)) {
    return layout.map((item) => clampToColumns(item, columns));
  }

  const threshold = 0.35;
  const maxIterations = Math.max(16, layout.length * 4);
  const order = new Map(layout.map((item, index) => [item.i, index]));
  const resolved = new Map<string, T>(
    layout.map((item) => [item.i, clampToColumns(item, columns)]),
  );
  const priorityItem = resolved.get(priorityItemId)!;
  const queue = localBlockers(priorityItem, [...resolved.values()], threshold).map((item) => ({
    itemId: item.i,
    pusherId: priorityItemId,
  }));

  let iteration = 0;
  while (queue.length && iteration < maxIterations) {
    iteration += 1;
    const next = queue.shift();
    if (!next || next.itemId === priorityItemId) continue;

    const item = resolved.get(next.itemId);
    const pusher = resolved.get(next.pusherId);
    if (!item || !pusher) continue;

    const position = pushPosition(item, pusher, [...resolved.values()], columns, vector);
    const moved = { ...item, ...position };
    resolved.set(item.i, moved);

    for (const candidate of resolved.values()) {
      if (
        candidate.i !== priorityItemId &&
        candidate.i !== moved.i &&
        collides(moved, candidate) &&
        !queue.some((queued) => queued.itemId === candidate.i)
      ) {
        queue.push({ itemId: candidate.i, pusherId: moved.i });
      }
    }
  }

  return [...resolved.values()].sort((a, b) => (order.get(a.i) ?? 0) - (order.get(b.i) ?? 0));
}

export function resolveLayoutCollisions<T extends Box>(
  layout: readonly T[],
  columns: number,
  priorityItemId: string | null,
  vector: DragVector,
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
    const position = findNearestOpenPosition(clamped, placed, columns, vector);
    placed.push({ ...clamped, ...position });
  }

  return placed.sort((a, b) => (order.get(a.i) ?? 0) - (order.get(b.i) ?? 0));
}
