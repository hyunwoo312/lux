import { reportStorageFailure, reportStorageSuccess } from "@/lib/storage-status";

export const WELCOME_SEEN_KEY = "lux.welcome.seen";
export const DASHBOARD_SEEDED_KEY = "lux.dashboard.seeded";

export const POLLED_CACHE_PREFIX = "lux:polled:";
export const PAGED_CACHE_PREFIX = "lux:paged:";
const RESOURCE_CACHE_PREFIXES = [POLLED_CACHE_PREFIX, PAGED_CACHE_PREFIX];

export function isResourceCacheKey(key: string): boolean {
  return RESOURCE_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

const AT_MARKER = '"at":';

export function cachedAt(raw: string): number | null {
  const marker = raw.lastIndexOf(AT_MARKER);
  if (marker !== -1) {
    const at = Number.parseInt(raw.slice(marker + AT_MARKER.length, marker + 30), 10);
    if (Number.isFinite(at)) return at;
  }
  try {
    const at = (JSON.parse(raw) as { at?: unknown }).at;
    return typeof at === "number" ? at : null;
  } catch {
    return null;
  }
}

function evictOldestResourceCache(): boolean {
  try {
    let oldestKey: string | null = null;
    let oldestAt = Number.POSITIVE_INFINITY;
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !isResourceCacheKey(key)) continue;
      const raw = localStorage.getItem(key);
      const at =
        raw === null ? Number.NEGATIVE_INFINITY : (cachedAt(raw) ?? Number.NEGATIVE_INFINITY);
      if (at < oldestAt) {
        oldestAt = at;
        oldestKey = key;
      }
    }
    if (oldestKey === null) return false;
    localStorage.removeItem(oldestKey);
    return true;
  } catch {
    return false;
  }
}

export function getLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "QuotaExceededError";
}

export function setLocal(key: string, value: string): boolean {
  for (;;) {
    try {
      localStorage.setItem(key, value);
      if (!isResourceCacheKey(key)) reportStorageSuccess(key, value);
      return true;
    } catch (error) {
      if (!isQuotaError(error)) {
        console.warn(`Failed to write "${key}" to local storage`, error);
        if (!isResourceCacheKey(key))
          reportStorageFailure(key, async () => {
            setLocal(key, value);
          });
        return false;
      }
      if (!evictOldestResourceCache()) {
        if (!isResourceCacheKey(key))
          reportStorageFailure(key, async () => {
            setLocal(key, value);
          });
        return false;
      }
    }
  }
}

export function removeLocal(key: string): void {
  try {
    localStorage.removeItem(key);
    if (!isResourceCacheKey(key)) reportStorageSuccess(key, undefined);
  } catch {
    if (!isResourceCacheKey(key))
      reportStorageFailure(key, async () => {
        removeLocal(key);
      });
    return;
  }
}
