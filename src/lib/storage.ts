import type { ZodType } from "zod";
import type { PersistStorage, StorageValue } from "zustand/middleware";

const NAMESPACE = "lux";
const namespaced = (name: string) => `${NAMESPACE}:${name}`;

export async function read<T>(name: string, schema: ZodType<T>, fallback: T): Promise<T> {
  const key = namespaced(name);
  try {
    const stored = await chrome.storage.local.get(key);
    if (stored[key] === undefined) return fallback;
    const result = schema.safeParse(stored[key]);
    if (result.success) return result.data;
    console.warn(`Discarding invalid stored value for "${name}"`, result.error.issues);
    return fallback;
  } catch (error) {
    console.warn(`Failed to read "${name}" from storage`, error);
    return fallback;
  }
}

export async function write(name: string, value: unknown): Promise<void> {
  try {
    await chrome.storage.local.set({ [namespaced(name)]: value });
  } catch (error) {
    console.warn(`Failed to write "${name}" to storage`, error);
  }
}

export async function remove(name: string): Promise<void> {
  try {
    await chrome.storage.local.remove(namespaced(name));
  } catch (error) {
    console.warn(`Failed to remove "${name}" from storage`, error);
  }
}

type GatedStorage<S> = PersistStorage<S> & { open: () => void };

export function createGatedChromeStorage<S>(): GatedStorage<S> {
  let hydrated = false;
  return {
    getItem: async (name) => {
      const key = namespaced(name);
      try {
        const stored = await chrome.storage.local.get(key);
        const raw = stored[key];
        if (raw === undefined) return null;
        if (typeof raw === "string") {
          return JSON.parse(raw) as StorageValue<S>;
        }
        return raw as StorageValue<S>;
      } catch (error) {
        console.warn(`Failed to read "${name}" from storage`, error);
        return null;
      }
    },
    setItem: async (name, value) => {
      if (hydrated) await write(name, value);
    },
    removeItem: async (name) => {
      if (hydrated) await remove(name);
    },
    open: () => {
      hydrated = true;
    },
  };
}
