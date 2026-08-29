export const WELCOME_SEEN_KEY = "lux.welcome.seen";
export const DASHBOARD_SEEDED_KEY = "lux.dashboard.seeded";

export const POLLED_CACHE_PREFIX = "lux:polled:";
export const PAGED_CACHE_PREFIX = "lux:paged:";
const RESOURCE_CACHE_PREFIXES = [POLLED_CACHE_PREFIX, PAGED_CACHE_PREFIX];

export function isResourceCacheKey(key: string): boolean {
  return RESOURCE_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function cachedAt(raw: string): number {
  try {
    const at = (JSON.parse(raw) as { at?: unknown }).at;
    return typeof at === "number" ? at : Number.NEGATIVE_INFINITY;
  } catch {
    return Number.NEGATIVE_INFINITY;
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
      const at = raw === null ? Number.NEGATIVE_INFINITY : cachedAt(raw);
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
      return true;
    } catch (error) {
      if (!isQuotaError(error)) {
        console.warn(`Failed to write "${key}" to local storage`, error);
        return false;
      }
      if (!evictOldestResourceCache()) return false;
    }
  }
}

export function removeLocal(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    return;
  }
}
