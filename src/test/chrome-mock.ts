import { vi } from "vitest";

function createChromeMock() {
  const store = new Map<string, unknown>();

  return {
    runtime: {
      onInstalled: { addListener: vi.fn() },
      lastError: undefined as { message: string } | undefined,
    },
    storage: {
      local: {
        get: vi.fn(async (keys?: string | string[] | null) => {
          if (keys == null) return Object.fromEntries(store);
          const list = Array.isArray(keys) ? keys : [keys];
          return Object.fromEntries(list.filter((k) => store.has(k)).map((k) => [k, store.get(k)]));
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          for (const [k, v] of Object.entries(items)) store.set(k, v);
        }),
        remove: vi.fn(async (keys: string | string[]) => {
          for (const k of Array.isArray(keys) ? keys : [keys]) store.delete(k);
        }),
        clear: vi.fn(async () => store.clear()),
      },
    },
    permissions: {
      getAll: vi.fn(async () => ({
        permissions: [
          "storage",
          "favicon",
          "identity",
          "bookmarks",
          "history",
          "sessions",
          "tabs",
          "topSites",
        ],
        origins: [] as string[],
      })),
      request: vi.fn(async () => true),
      remove: vi.fn(async () => true),
      contains: vi.fn(async () => true),
      onAdded: { addListener: vi.fn(), removeListener: vi.fn() },
      onRemoved: { addListener: vi.fn(), removeListener: vi.fn() },
    },
    bookmarks: {
      getTree: vi.fn(async () => []),
      search: vi.fn(async () => []),
    },
    history: {
      search: vi.fn(async () => []),
    },
    sessions: {
      getRecentlyClosed: vi.fn(async () => []),
      restore: vi.fn(async () => undefined),
    },
    topSites: {
      get: vi.fn(async () => []),
    },
  };
}

export function installChromeMock() {
  (globalThis as { chrome?: unknown }).chrome = createChromeMock();
}
