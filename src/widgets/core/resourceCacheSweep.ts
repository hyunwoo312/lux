import { cachedAt, isResourceCacheKey } from "@/lib/local-store";

const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function isStale(raw: string, now: number, maxAgeMs: number): boolean {
  const at = cachedAt(raw);
  return at === null ? true : now - at > maxAgeMs;
}

export function sweepStaleResourceCaches(now: number, maxAgeMs: number = DEFAULT_MAX_AGE_MS): void {
  const removable: string[] = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !isResourceCacheKey(key)) continue;
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
      continue;
    }
  }
}
