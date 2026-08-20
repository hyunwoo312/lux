import { measureAllAssets } from "@/lib/asset-store";
import { RESOURCE_CACHE_PREFIXES } from "@/lib/local-store";

export const LOCAL_STORAGE_CAP_BYTES = 5 * 1024 * 1024;

const WARN_RATIO = 0.7;
const DANGER_RATIO = 0.9;

export type StorageUsage = {
  localBytes: number;
  localCacheBytes: number;
  chromeBytes: number | null;
  imageBytes: number | null;
  imageCount: number;
};

export type StorageSeverity = "calm" | "warning" | "danger";

export function severityOf(bytes: number, cap = LOCAL_STORAGE_CAP_BYTES): StorageSeverity {
  const ratio = bytes / cap;
  if (ratio >= DANGER_RATIO) return "danger";
  if (ratio >= WARN_RATIO) return "warning";
  return "calm";
}

function isResourceCacheKey(key: string): boolean {
  return RESOURCE_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function measureLocalStorage(): { totalBytes: number; cacheBytes: number } {
  let totalBytes = 0;
  let cacheBytes = 0;
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key === null) continue;
      const bytes = (key.length + (localStorage.getItem(key)?.length ?? 0)) * 2;
      totalBytes += bytes;
      if (isResourceCacheKey(key)) cacheBytes += bytes;
    }
  } catch {
    return { totalBytes, cacheBytes };
  }
  return { totalBytes, cacheBytes };
}

async function measureChromeStorage(): Promise<number | null> {
  if (typeof chrome === "undefined" || !chrome.storage?.local?.getBytesInUse) return null;
  try {
    return await chrome.storage.local.getBytesInUse(null);
  } catch {
    return null;
  }
}

const MEASURE_TIMEOUT_MS = 3000;

function settledOr<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), MEASURE_TIMEOUT_MS)),
  ]);
}

export async function measureStorage(): Promise<StorageUsage> {
  const local = measureLocalStorage();
  const [chromeBytes, assets] = await Promise.all([
    settledOr(measureChromeStorage(), null),
    settledOr(measureAllAssets(), null),
  ]);
  return {
    localBytes: local.totalBytes,
    localCacheBytes: local.cacheBytes,
    chromeBytes,
    imageBytes: assets?.bytes ?? null,
    imageCount: assets?.count ?? 0,
  };
}

export function clearResourceCaches(): void {
  const removable: string[] = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key !== null && isResourceCacheKey(key)) removable.push(key);
    }
    for (const key of removable) localStorage.removeItem(key);
  } catch {
    return;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1000) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? Number(mb.toFixed(1)) : Math.round(mb)} MB`;
}
