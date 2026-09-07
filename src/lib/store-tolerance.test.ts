// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { STORE_KEYS } from "@/lib/profile";
import { sourceFiles, sourcePath } from "@/test/source-files";

type PersistedStore = {
  getState: () => object;
  persist: {
    getOptions: () => {
      name?: string;
      partialize?: (state: object) => unknown;
      merge?: (persisted: unknown, current: object) => object;
    };
  };
};

function isPersistedStore(value: unknown): value is PersistedStore {
  return (
    typeof value === "function" &&
    "persist" in value &&
    typeof (value as { persist?: { getOptions?: unknown } }).persist?.getOptions === "function"
  );
}

const storeModules = sourceFiles()
  .filter((file) => /createPersistedStore<\w+>\(\)\(/.test(readFileSync(file, "utf8")))
  .map((file) => `@/${sourcePath(file).replace(/\.tsx?$/, "")}`);

async function loadStore(module: string): Promise<PersistedStore> {
  const exports: unknown = await import(module);
  const store = Object.values(exports as Record<string, unknown>).find(isPersistedStore);
  if (!store) throw new Error(`${module} exports no persisted store`);
  return store;
}

describe("every persisted store reads back what it writes without resetting", () => {
  const seen: string[] = [];

  for (const module of storeModules) {
    it(module, async () => {
      const store = await loadStore(module);
      const { name, partialize, merge } = store.persist.getOptions();
      if (name) seen.push(name);
      expect(merge).toBeDefined();

      const initial = store.getState();
      const written = partialize ? partialize(initial) : initial;
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      merge?.({}, initial);
      merge?.(written, initial);
      merge?.(JSON.parse(JSON.stringify(written)), initial);

      const resets = warn.mock.calls
        .map((call) => String(call[0]))
        .filter((message) => /Resetting|Refusing/.test(message));
      warn.mockRestore();
      expect(resets).toEqual([]);
    });
  }

  it("covers every key in the profile ledger", () => {
    expect(seen.sort()).toEqual([...STORE_KEYS].sort());
  });
});
