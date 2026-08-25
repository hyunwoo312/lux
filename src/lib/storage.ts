import type { ZodType } from "zod";
import type { PersistStorage, StorageValue } from "zustand/middleware";
import { profileReady } from "@/lib/profile";

const NAMESPACE = "lux";
const namespaced = (name: string) => `${NAMESPACE}:${name}`;

export async function read<T>(name: string, schema: ZodType<T>, fallback: T): Promise<T> {
  const key = namespaced(name);
  try {
    await profileReady();
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
    await profileReady();
    await chrome.storage.local.set({ [namespaced(name)]: value });
  } catch (error) {
    console.warn(`Failed to write "${name}" to storage`, error);
  }
}

export async function writeOrThrow(name: string, value: unknown): Promise<void> {
  await profileReady();
  await chrome.storage.local.set({ [namespaced(name)]: value });
}

export async function remove(name: string): Promise<void> {
  try {
    await profileReady();
    await chrome.storage.local.remove(namespaced(name));
  } catch (error) {
    console.warn(`Failed to remove "${name}" from storage`, error);
  }
}

export function watchStorage(name: string, onChange: (value: unknown) => void): () => void {
  if (typeof chrome === "undefined" || !chrome.storage?.onChanged) return () => {};
  const key = namespaced(name);
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: chrome.storage.AreaName,
  ) => {
    const change = changes[key];
    if (areaName === "local" && change) onChange(change.newValue);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

type PersistedStore = { persist: { rehydrate: () => void | Promise<void> } };

type StorageOpen = "boot" | "resync" | "unreadable";

type GatedStorage<S> = PersistStorage<S> & { open: (store: PersistedStore) => StorageOpen };

const serialize = (value: unknown) => JSON.stringify(value ?? null);

export function createGatedChromeStorage<S>(): GatedStorage<S> {
  let readable = false;
  let opened = false;
  let watching = false;
  let storeName: string | undefined;
  const selfWrites: string[] = [];
  return {
    getItem: async (name) => {
      storeName = name;
      const key = namespaced(name);
      try {
        await profileReady();
        const stored = await chrome.storage.local.get(key);
        readable = true;
        const raw = stored[key];
        if (raw === undefined) return null;
        if (typeof raw === "string") {
          return JSON.parse(raw) as StorageValue<S>;
        }
        return raw as StorageValue<S>;
      } catch (error) {
        readable = false;
        console.warn(`Refusing to write "${name}" — it could not be read`, error);
        return null;
      }
    },
    setItem: async (name, value) => {
      if (!readable) return;
      selfWrites.push(serialize(value));
      await write(name, value);
    },
    removeItem: async (name) => {
      if (!readable) return;
      selfWrites.push(serialize(undefined));
      await remove(name);
    },
    open: (store) => {
      if (!readable) return "unreadable";
      const opening: StorageOpen = opened ? "resync" : "boot";
      opened = true;
      if (watching || storeName === undefined) return opening;
      watching = true;
      watchStorage(storeName, (value) => {
        if (selfWrites[0] === serialize(value)) {
          selfWrites.shift();
          return;
        }
        selfWrites.length = 0;
        void store.persist.rehydrate();
      });
      return opening;
    },
  };
}
