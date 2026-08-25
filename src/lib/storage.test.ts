import { z } from "zod";
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

  it("holds writes back until the store says it is hydrated", async () => {
    const { storage, handle } = makeStore();

    await storage.setItem("gated", { state: { n: 1 }, version: 1 });
    expect(await chrome.storage.local.get("lux:gated")).toEqual({});

    storage.open(handle);
    await storage.setItem("gated", { state: { n: 2 }, version: 1 });
    expect(await chrome.storage.local.get("lux:gated")).toEqual({
      "lux:gated": { state: { n: 2 }, version: 1 },
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
