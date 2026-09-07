import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ASSET_DATABASES,
  BROWSER_LOCAL_KEYS,
  BROWSER_LOCAL_PREFIXES,
  EXTENSION_LOCAL_KEYS,
  EXTENSION_SESSION_KEYS,
  STORE_KEYS,
} from "@/lib/profile";
import { sourceFiles, sourcePath } from "@/test/source-files";

const sources = sourceFiles().map((file) => ({
  file: sourcePath(file),
  body: readFileSync(file, "utf8"),
}));

const STORE_CALL = /createPersistedStore<\w+>\(\)\(/;

const stores = sources
  .filter(({ body }) => STORE_CALL.test(body))
  .map(({ file, body }) => ({
    file,
    name: /\bname:\s*"([^"]+)"/.exec(body.slice(body.search(STORE_CALL)))?.[1],
  }));

describe("every persisted store", () => {
  it("is registered in the profile ledger", () => {
    const names = stores.map((store) => store.name).sort();
    expect(names).toEqual([...STORE_KEYS].sort());
  });

  it("uses widget:<slug> for widgets and a bare name for the rest", () => {
    const offenders = stores.filter(
      (store) => !/^(widget:[a-z-]+|[a-z-]+)$/.test(store.name ?? ""),
    );
    expect(offenders.map((store) => store.file)).toEqual([]);
  });

  it("goes through createPersistedStore, which keeps unknown versions and reports resets", () => {
    const offenders = sources.filter(
      ({ file, body }) => file !== "lib/storage.ts" && body.includes('from "zustand/middleware"'),
    );
    expect(offenders.map((store) => store.file)).toEqual([]);
  });
});

describe("every key this extension writes", () => {
  const registered = [
    ...EXTENSION_LOCAL_KEYS,
    ...EXTENSION_SESSION_KEYS,
    ...BROWSER_LOCAL_KEYS,
    ...BROWSER_LOCAL_PREFIXES,
    ...ASSET_DATABASES,
  ];

  const covers = (literal: string) =>
    registered.some((key) => key === literal || literal.startsWith(key));

  const STORAGE_CALL =
    /(?<![.\w])(?:read|readResult|write|writeOrThrow|remove|watchStorage)\(\s*("[^"]+"|[A-Za-z_$][\w$]*)/g;

  function storageNames(body: string): string[] {
    if (!body.includes('from "@/lib/storage"')) return [];
    const constants = new Map(
      [...body.matchAll(/const ([A-Z_]+) = "([^"]+)"/g)].map((match) => [match[1], match[2]]),
    );
    return [...body.matchAll(STORAGE_CALL)].map(([, argument = ""]) => {
      const name = argument.startsWith('"') ? argument.slice(1, -1) : constants.get(argument);
      return name === undefined ? `<unresolved ${argument}>` : `lux:${name}`;
    });
  }

  it("is named in the profile registry", () => {
    const strays: string[] = [];
    let inspected = 0;
    for (const file of sourceFiles()) {
      if (file.endsWith("profile.ts") || file.endsWith("backup.ts")) continue;
      const body = readFileSync(file, "utf8");
      const literals = [...body.matchAll(/"(lux[.:][a-z.:-]*)"/g)].map((match) => match[1] ?? "");
      const names = storageNames(body);
      inspected += literals.length + names.length;
      for (const key of [...literals, ...names]) {
        if (!covers(key)) strays.push(`${sourcePath(file)}: ${key}`);
      }
    }
    expect([...new Set(strays)]).toEqual([]);
    expect(inspected, "nothing inspected — the key scan is broken").toBeGreaterThan(20);
  });
});
