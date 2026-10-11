type WriteFailure = { name: string; retry?: () => Promise<void> };

const failures = new Map<string, WriteFailure>();
const listeners = new Set<() => void>();
const writtenListeners = new Set<(name: string, value: unknown) => void>();
let snapshot: readonly WriteFailure[] = [];

function publish(): void {
  snapshot = [...failures.values()];
  queueMicrotask(() => {
    for (const listener of listeners) listener();
  });
}

export function reportStorageFailure(name: string, retry?: () => Promise<void>): void {
  if (failures.has(name) && failures.get(name)?.retry === retry) return;
  failures.set(name, { name, retry });
  publish();
}

export function reportStorageSuccess(name: string, value: unknown): void {
  if (failures.delete(name)) publish();
  for (const listener of writtenListeners) listener(name, value);
}

export function subscribeStorageFailures(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function storageFailures(): readonly WriteFailure[] {
  return snapshot;
}

export function watchStorageWrites(listener: (name: string, value: unknown) => void): () => void {
  writtenListeners.add(listener);
  return () => writtenListeners.delete(listener);
}

export async function retryStorageWrites(): Promise<void> {
  await Promise.all([...failures.values()].map((failure) => failure.retry?.()));
}
