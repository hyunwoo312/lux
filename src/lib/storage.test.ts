import { z } from "zod";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createGatedChromeStorage, read, remove, watchStorage, write } from "@/lib/storage";

const schema = z.object({ count: z.number() });
const fallback = { count: 0 };

type ChangeListener = (
  changes: Record<string, chrome.storage.StorageChange>,
  area: chrome.storage.AreaName,
) => void;

function installOnChanged() {
  const listeners = new Set<ChangeListener>();
  const chromeRef = (globalThis as unknown as { chrome: typeof chrome }).chrome;
  (chromeRef.storage as unknown as { onChanged: unknown }).onChanged = {
    addListener: (l: ChangeListener) => listeners.add(l),
    removeListener: (l: ChangeListener) => listeners.delete(l),
  };
  return (changes: Record<string, chrome.storage.StorageChange>, area = "local") => {
    for (const l of listeners) l(changes, area as chrome.storage.AreaName);
  };
}

describe("storage", () => {
  it("returns the fallback when nothing is stored", async () => {
    expect(await read("missing", schema, fallback)).toEqual(fallback);
  });

  it("round-trips a valid value", async () => {
    await write("counter", { count: 3 });
    expect(await read("counter", schema, fallback)).toEqual({ count: 3 });
  });

  it("rejects schema-invalid data and returns the fallback", async () => {
    await write("counter", { count: "not-a-number" });
    expect(await read("counter", schema, fallback)).toEqual(fallback);
  });

  it("removes a stored value", async () => {
    await write("counter", { count: 9 });
    await remove("counter");
    expect(await read("counter", schema, fallback)).toEqual(fallback);
  });
});

describe("watchStorage", () => {
  it("fires only for local changes to the namespaced key", () => {
    const emit = installOnChanged();
    const onChange = vi.fn();
    watchStorage("integrations", onChange);

    emit({ "lux:integrations": { newValue: 1 } }, "local");
    expect(onChange).toHaveBeenCalledTimes(1);

    emit({ "lux:other": { newValue: 1 } }, "local");
    emit({ "lux:integrations": { newValue: 2 } }, "sync");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("stops firing after unsubscribe", () => {
    const emit = installOnChanged();
    const onChange = vi.fn();
    const stop = watchStorage("integrations", onChange);
    stop();

    emit({ "lux:integrations": { newValue: 1 } }, "local");
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("createGatedChromeStorage", () => {
  const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

  function makeStore() {
    const storage = createGatedChromeStorage<{ n: number }>();
    const rehydrate = vi.fn();
    return { storage, rehydrate, handle: { persist: { rehydrate } } };
  }

  it("holds writes back until it has read what is already there", async () => {
    const { storage } = makeStore();

    await storage.setItem("gated", { state: { n: 1 }, version: 1 });
    expect(await chrome.storage.local.get("lux:gated")).toEqual({});

    await storage.getItem("gated");
    await storage.setItem("gated", { state: { n: 2 }, version: 1 });

    expect(await chrome.storage.local.get("lux:gated")).toEqual({
      "lux:gated": { state: { n: 2 }, version: 1 },
    });
  });

  it("shuts again if a later read fails, so a resync cannot overwrite either", async () => {
    const { storage } = makeStore();
    await chrome.storage.local.set({ "lux:gated": { state: { n: 7 }, version: 1 } });
    await storage.getItem("gated");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(chrome.storage.local, "get").mockRejectedValueOnce(new Error("transient"));

    await storage.getItem("gated");
    await storage.setItem("gated", { state: { n: 0 }, version: 1 });

    expect(await chrome.storage.local.get("lux:gated")).toEqual({
      "lux:gated": { state: { n: 7 }, version: 1 },
    });
  });

  it("never overwrites data it could not read", async () => {
    const { storage, handle } = makeStore();
    await chrome.storage.local.set({ "lux:gated": { state: { n: 7 }, version: 1 } });
    vi.spyOn(chrome.storage.local, "get").mockRejectedValueOnce(new Error("transient"));
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(await storage.getItem("gated")).toBeNull();
    expect(storage.open(handle)).toBe("unreadable");
    await storage.setItem("gated", { state: { n: 0 }, version: 1 });

    expect(await chrome.storage.local.get("lux:gated")).toEqual({
      "lux:gated": { state: { n: 7 }, version: 1 },
    });
  });

  it("reloads when another tab writes the same store", async () => {
    const { storage, rehydrate, handle } = makeStore();
    await storage.getItem("gated");
    storage.open(handle);

    await chrome.storage.local.set({ "lux:gated": { state: { n: 7 }, version: 1 } });
    await settled();

    expect(rehydrate).toHaveBeenCalledOnce();
  });

  it("ignores the echo of its own writes, even when several are in flight", async () => {
    const { storage, rehydrate, handle } = makeStore();
    await storage.getItem("gated");
    storage.open(handle);

    await storage.setItem("gated", { state: { n: 3 }, version: 1 });
    await storage.setItem("gated", { state: { n: 4 }, version: 1 });
    await settled();

    expect(rehydrate).not.toHaveBeenCalled();
  });

  it("lets a migration reach disk, so it does not run again forever", async () => {
    await chrome.storage.local.set({ "lux:migrated": { state: { old: 1 }, version: 1 } });
    const gated = createGatedChromeStorage<{ fresh: number }>();
    const useMigrated = create<{ fresh: number }>()(
      persist(() => ({ fresh: 0 }), {
        name: "migrated",
        storage: gated,
        version: 2,
        migrate: () => ({ fresh: 99 }),
        onRehydrateStorage: () => () => gated.open(useMigrated),
      }),
    );

    await settled();

    expect(await chrome.storage.local.get("lux:migrated")).toEqual({
      "lux:migrated": { state: { fresh: 99 }, version: 2 },
    });
  });

  it("tells a first open apart from a later resync", async () => {
    const { storage, handle } = makeStore();
    await storage.getItem("gated");

    expect(storage.open(handle)).toBe("boot");
    expect(storage.open(handle)).toBe("resync");
  });

  it("ignores another store's key", async () => {
    const { storage, rehydrate, handle } = makeStore();
    await storage.getItem("gated");
    storage.open(handle);

    await chrome.storage.local.set({ "lux:elsewhere": { state: {}, version: 1 } });
    await settled();

    expect(rehydrate).not.toHaveBeenCalled();
  });
});
