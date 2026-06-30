export function patchInstance<T>(
  byInstance: Record<string, T>,
  id: string,
  fallback: T,
  fn: (data: T) => T,
): Record<string, T> {
  return { ...byInstance, [id]: fn(byInstance[id] ?? fallback) };
}

export function dropInstance<T>(byInstance: Record<string, T>, id: string): Record<string, T> {
  if (!(id in byInstance)) return byInstance;
  const next = { ...byInstance };
  delete next[id];
  return next;
}
