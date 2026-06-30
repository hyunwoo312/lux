type InstanceCleanup = (instanceId: string) => void;

const cleanups = new Set<InstanceCleanup>();

export function registerInstanceCleanup(cleanup: InstanceCleanup): void {
  cleanups.add(cleanup);
}

export function pruneInstance(instanceId: string): void {
  for (const cleanup of cleanups) cleanup(instanceId);
}
