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
  };
}

export function installChromeMock() {
  (globalThis as { chrome?: unknown }).chrome = createChromeMock();
}
