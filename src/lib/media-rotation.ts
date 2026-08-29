import { getLocal, removeLocal, setLocal } from "@/lib/local-store";

type NewtabQueueState = {
  signature: string;
  queue: string[];
  last: string | null;
};

export type RotationOrder = "shuffle" | "sequential";

export type MediaSelection<T> = {
  mode: "single" | "multi";
  single: T | null;
  items: T[];
};

export function mediaList<T>({ mode, single, items }: MediaSelection<T>): T[] {
  return mode === "multi" ? items : single ? [single] : [];
}

export function normalizeIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

export function getSignature(assetIds: string[]): string {
  return assetIds.join(" ");
}

export function getNextSequentialIndex(current: number, length: number): number {
  return length <= 0 ? 0 : (current + 1) % length;
}

export function getRandomIndexExcluding(length: number, excluded: number): number {
  if (length <= 1) return 0;
  const offset = 1 + Math.floor(Math.random() * (length - 1));
  return (excluded + offset) % length;
}

function swapLeadIfRepeat(queue: string[], previous: string | null): void {
  if (queue.length <= 1 || queue[0] !== previous) return;
  const [first, second] = queue;
  if (first !== undefined && second !== undefined) {
    queue[0] = second;
    queue[1] = first;
  }
}

function sequentialQueue(assetIds: string[], previous: string | null): string[] {
  const start = previous ? assetIds.indexOf(previous) + 1 : 0;
  return [...assetIds.slice(start), ...assetIds.slice(0, start)];
}

function shuffle(assetIds: string[], previous: string | null): string[] {
  const queue = [...assetIds];
  for (let index = queue.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const a = queue[index];
    const b = queue[swap];
    if (a !== undefined && b !== undefined) {
      queue[index] = b;
      queue[swap] = a;
    }
  }
  swapLeadIfRepeat(queue, previous);
  return queue;
}

export function selectNewtabIndex(
  assetIds: string[],
  stored: NewtabQueueState | null,
  order: RotationOrder = "shuffle",
): { index: number; next: NewtabQueueState } {
  const signature = `${order}:${getSignature(assetIds)}`;
  if (!assetIds.length) {
    return { index: 0, next: { signature, queue: [], last: null } };
  }

  const known = new Set(assetIds);
  const previous = stored?.last ?? null;
  let queue =
    stored && stored.signature === signature ? stored.queue.filter((id) => known.has(id)) : [];

  if (!queue.length) {
    queue =
      order === "sequential" ? sequentialQueue(assetIds, previous) : shuffle(assetIds, previous);
  } else {
    swapLeadIfRepeat(queue, previous);
  }

  const selected = queue.shift() ?? assetIds[0] ?? "";
  const index = Math.max(
    0,
    assetIds.findIndex((id) => id === selected),
  );

  return { index, next: { signature, queue, last: selected } };
}

function isNewtabQueueState(value: unknown): value is NewtabQueueState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Record<string, unknown>;
  return (
    typeof state.signature === "string" &&
    Array.isArray(state.queue) &&
    state.queue.every((id) => typeof id === "string") &&
    (typeof state.last === "string" || state.last === null)
  );
}

export function readNewtabQueue(key: string): NewtabQueueState | null {
  const raw = getLocal(key);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isNewtabQueueState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeNewtabQueue(key: string, state: NewtabQueueState): void {
  setLocal(key, JSON.stringify(state));
}

export function clearNewtabQueue(key: string): void {
  removeLocal(key);
}
