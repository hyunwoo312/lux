import { vi } from "vitest";

function createChromeMock() {
  const store = new Map<string, unknown>();
  const session = new Map<string, unknown>();
  const changeListeners = new Set<
    (changes: Record<string, { newValue?: unknown }>, areaName: string) => void
  >();

  function emitChange(changes: Record<string, { newValue?: unknown }>, areaName: string) {
    const listeners = [...changeListeners];
    setTimeout(() => {
      for (const listener of listeners) listener(changes, areaName);
    }, 0);
  }

  return {
    runtime: {
      onInstalled: { addListener: vi.fn() },
      onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
      sendMessage: vi.fn(async () => undefined),
      lastError: undefined as { message: string } | undefined,
    },
    tabs: {
      create: vi.fn(async () => ({ id: 1 })),
      remove: vi.fn(async () => undefined),
      onRemoved: { addListener: vi.fn(), removeListener: vi.fn() },
    },
    storage: {
      local: {
        get: vi.fn(async (keys?: string | string[] | null) => {
          if (keys == null) return Object.fromEntries(store);
          const list = Array.isArray(keys) ? keys : [keys];
          return Object.fromEntries(list.filter((k) => store.has(k)).map((k) => [k, store.get(k)]));
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          const changes: Record<string, { newValue?: unknown }> = {};
          for (const [k, v] of Object.entries(items)) {
            store.set(k, v);
            changes[k] = { newValue: v };
          }
          emitChange(changes, "local");
        }),
        remove: vi.fn(async (keys: string | string[]) => {
          const changes: Record<string, { newValue?: unknown }> = {};
          for (const k of Array.isArray(keys) ? keys : [keys]) {
            store.delete(k);
            changes[k] = {};
          }
          emitChange(changes, "local");
        }),
        clear: vi.fn(async () => store.clear()),
      },
      session: {
        get: vi.fn(async (keys?: string | string[] | null) => {
          if (keys == null) return Object.fromEntries(session);
          const list = Array.isArray(keys) ? keys : [keys];
          return Object.fromEntries(
            list.filter((k) => session.has(k)).map((k) => [k, session.get(k)]),
          );
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          const changes: Record<string, { newValue?: unknown }> = {};
          for (const [k, v] of Object.entries(items)) {
            session.set(k, v);
            changes[k] = { newValue: v };
          }
          emitChange(changes, "session");
        }),
        remove: vi.fn(async (keys: string | string[]) => {
          for (const k of Array.isArray(keys) ? keys : [keys]) session.delete(k);
        }),
        clear: vi.fn(async () => session.clear()),
      },
      onChanged: {
        addListener: vi.fn((listener: (c: never, a: string) => void) => {
          changeListeners.add(listener as never);
        }),
        removeListener: vi.fn((listener: (c: never, a: string) => void) => {
          changeListeners.delete(listener as never);
        }),
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
          "search",
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
    search: {
      query: vi.fn(async () => undefined),
    },
  };
}

export function installChromeMock() {
  (globalThis as { chrome?: unknown }).chrome = createChromeMock();
}
