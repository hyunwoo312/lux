const RESOURCE_CACHE_PREFIXES = ["lux:polled:", "lux:paged:"];
const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function isStale(raw: string, now: number, maxAgeMs: number): boolean {
  try {
    const at = (JSON.parse(raw) as { at?: unknown }).at;
    return typeof at === "number" && now - at > maxAgeMs;
  } catch {
    return true;
  }
}

export function sweepStaleResourceCaches(now: number, maxAgeMs: number = DEFAULT_MAX_AGE_MS): void {
  const removable: string[] = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !RESOURCE_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) continue;
      const raw = localStorage.getItem(key);
      if (raw !== null && isStale(raw, now, maxAgeMs)) removable.push(key);
    }
  } catch {
    return;
  }
  for (const key of removable) {
    try {
      localStorage.removeItem(key);
    } catch {
      return;
    }
  }
}
