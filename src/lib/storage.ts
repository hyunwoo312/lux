import type { ZodType } from "zod";
import { create, type StateCreator } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import { keepPersisted, mergePersisted } from "@/lib/persist";
import { profileReady, STORE_KEYS } from "@/lib/profile";
import { reportStorageFailure, reportStorageSuccess } from "@/lib/storage-status";

const NAMESPACE = "lux";
const namespaced = (name: string) => `${NAMESPACE}:${name}`;

type ReadResult<T> = { status: "read"; value: T } | { status: "absent" } | { status: "unreadable" };

export async function readResult<T>(name: string, schema: ZodType<T>): Promise<ReadResult<T>> {
  const key = namespaced(name);
  try {
    await profileReady();
    const stored = await chrome.storage.local.get(key);
    if (stored[key] === undefined) return { status: "absent" };
    const result = schema.safeParse(stored[key]);
    if (result.success) return { status: "read", value: result.data };
    console.warn(`Refusing to treat unreadable "${name}" as empty`, result.error.issues);
    return { status: "unreadable" };
  } catch (error) {
    console.warn(`Refusing to treat unreadable "${name}" as empty`, error);
    return { status: "unreadable" };
  }
}

export async function read<T>(name: string, schema: ZodType<T>, fallback: T): Promise<T> {
  const result = await readResult(name, schema);
  return result.status === "read" ? result.value : fallback;
}

export async function write(name: string, value: unknown): Promise<void> {
  await writeOrThrow(name, value).catch((error: unknown) => {
    console.warn(`Failed to write "${name}" to storage`, error);
  });
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

type StoreKey = (typeof STORE_KEYS)[number];
type RestoreSchema = {
  version: number;
  schema: ZodType;
  migrate: (persisted: unknown, version: number) => unknown;
};
const restoreSchemas = new Map<string, RestoreSchema>();
const pendingWrites = new Set<Promise<void>>();

function compatibleShape(original: unknown, restored: unknown): boolean {
  if (restored === undefined) return original === undefined;
  if (original === null || restored === null) return original === restored;
  if (typeof original !== typeof restored) return false;
  if (typeof restored !== "object") return true;
  if (Array.isArray(restored))
    return (
      Array.isArray(original) &&
      original.length === restored.length &&
      restored.every((entry, index) => compatibleShape(original[index], entry))
    );
  if (Array.isArray(original)) return false;
  const input = original as Record<string, unknown>;
  return Object.entries(restored).every(
    ([key, value]) => !(key in input) || compatibleShape(input[key], value),
  );
}

export async function flushStorageWrites(): Promise<void> {
  while (pendingWrites.size > 0) await Promise.all([...pendingWrites]);
}

export async function preparePersistedStore(name: string, value: unknown): Promise<unknown> {
  if (!(STORE_KEYS as readonly string[]).includes(name)) return value;
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`The backup contains unreadable ${name} settings.`);
  const envelope = value as Record<string, unknown>;
  const state = "state" in envelope ? envelope.state : value;
  if (!state || typeof state !== "object" || Array.isArray(state))
    throw new Error(`The backup contains unreadable ${name} settings.`);
  const definition = restoreSchemas.get(name);
  if (!definition) return value;
  const version = envelope.version ?? ("byInstance" in state ? definition.version : 0);
  if (typeof version !== "number" || !Number.isInteger(version) || version < 0)
    throw new Error(`The backup contains an invalid ${name} version.`);
  if (version > definition.version)
    throw new Error("This backup needs a newer version of Lux. Update Lux, then try again.");
  const migrated =
    version === definition.version ? state : await definition.migrate(state, version);
  const parsed = definition.schema.safeParse(migrated);
  if (!parsed.success) throw new Error(`The backup contains unreadable ${name} settings.`);
  const input = migrated as Record<string, unknown>;
  const output = parsed.data as Record<string, unknown>;
  if (!compatibleShape(input, output))
    throw new Error(`The backup contains unreadable ${name} settings.`);
  if (!Object.keys(output).some((key) => key in input))
    throw new Error(`The backup contains unreadable ${name} settings.`);
  for (const key of ["byInstance", "widgets", "layout"]) {
    if (!(key in output)) continue;
    const original = input[key];
    const restored = output[key];
    if (
      !original ||
      typeof original !== "object" ||
      Array.isArray(original) !== Array.isArray(restored) ||
      Object.keys(original).length !== Object.keys(restored as object).length
    )
      throw new Error(`The backup contains unreadable ${name} settings.`);
  }
  return { state: parsed.data, version: definition.version };
}

type PersistedStoreOptions<S, P> = {
  name: StoreKey;
  schema: ZodType<P>;
  partialize: (state: S) => unknown;
  build: (parsed: P, current: S) => S;
  version?: number;
  migrate?: (persisted: unknown, version: number) => unknown;
  onUnreadable?: (current: S) => S;
  onBoot?: (state: S) => void;
  resolveWrite?: (stored: unknown, next: unknown, previous: unknown) => unknown;
};

export function createPersistedStore<S>() {
  return <P>(
    initializer: StateCreator<S, [["zustand/persist", unknown]], []>,
    options: PersistedStoreOptions<S, P>,
  ) => {
    restoreSchemas.set(options.name, {
      version: options.version ?? 1,
      schema: options.schema,
      migrate: options.migrate ?? keepPersisted,
    });
    const gatedStorage = createGatedChromeStorage<unknown>(options.resolveWrite);
    const store = create<S>()(
      persist<S, [], [], unknown>(initializer, {
        name: options.name,
        storage: gatedStorage,
        version: options.version ?? 1,
        migrate: options.migrate ?? keepPersisted,
        partialize: options.partialize,
        onRehydrateStorage: () => (state) => {
          if (gatedStorage.open(store) !== "boot" || !state) return;
          options.onBoot?.(state);
        },
        merge: (persisted, current) =>
          mergePersisted(
            options.name,
            options.schema,
            persisted,
            current,
            (parsed) => options.build(parsed, current),
            options.onUnreadable,
          ),
      }),
    );
    return store;
  };
}

const serialize = (value: unknown) => JSON.stringify(value ?? null);

export function createGatedChromeStorage<S>(
  resolveWrite?: (stored: unknown, next: unknown, previous: unknown) => unknown,
): GatedStorage<S> {
  let readable = false;
  let opened = false;
  let watching = false;
  let storeName: string | undefined;
  let lastWritten: { name: string; encoded: string } | null = null;
  const selfWrites: string[] = [];
  let writes = Promise.resolve();
  let previousValue: unknown;
  let handle: PersistedStore | null = null;
  const enqueue = async (save: () => Promise<void>) => {
    writes = writes.then(save, save);
    const pending = writes;
    pendingWrites.add(pending);
    try {
      await pending;
    } finally {
      pendingWrites.delete(pending);
    }
  };
  const storage: GatedStorage<S> = {
    getItem: async (name) => {
      storeName = name;
      const key = namespaced(name);
      try {
        await writes;
        await profileReady();
        const stored = await chrome.storage.local.get(key);
        readable = true;
        const raw = stored[key];
        if (raw === undefined) {
          previousValue = undefined;
          return null;
        }
        const value =
          typeof raw === "string" ? (JSON.parse(raw) as StorageValue<S>) : (raw as StorageValue<S>);
        previousValue = value;
        return value;
      } catch (error) {
        readable = false;
        console.warn(`Refusing to write "${name}" — it could not be read`, error);
        return null;
      }
    },
    setItem: async (name, value) => {
      if (!readable) {
        reportStorageFailure(name);
        return;
      }
      const encoded = serialize(value);
      if (lastWritten?.name === name && lastWritten.encoded === encoded) return;
      lastWritten = { name, encoded };
      const previous = previousValue;
      previousValue = value;
      const save = async () => {
        let writtenEncoded = encoded;
        try {
          const write = async () => {
            const stored = resolveWrite
              ? await chrome.storage.local.get(namespaced(name))
              : undefined;
            const written = resolveWrite
              ? resolveWrite(stored?.[namespaced(name)], value, previous)
              : value;
            writtenEncoded = serialize(written);
            selfWrites.push(writtenEncoded);
            await writeOrThrow(name, written);
            reportStorageSuccess(name, written);
          };
          if (resolveWrite) await navigator.locks.request(`lux-store-write:${name}`, write);
          else await write();
          if (writtenEncoded !== encoded) void handle?.persist.rehydrate();
        } catch (error) {
          const echo = selfWrites.indexOf(writtenEncoded);
          if (echo !== -1) selfWrites.splice(echo, 1);
          if (lastWritten?.encoded === encoded) {
            lastWritten = null;
            reportStorageFailure(name, async () => {
              await enqueue(save);
            });
          }
          console.warn(`Failed to write "${name}" to storage`, error);
        }
      };
      await enqueue(save);
    },
    removeItem: async (name) => {
      if (!readable) return;
      lastWritten = null;
      await enqueue(async () => {
        selfWrites.push(serialize(undefined));
        await remove(name);
      });
    },
    open: (store) => {
      handle = store;
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
  return storage;
}
