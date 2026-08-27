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

const stores = sourceFiles()
  .map((file) => ({ file, body: readFileSync(file, "utf8") }))
  .filter(({ body }) => body.includes("createGatedChromeStorage"))
  .filter(({ file }) => !file.endsWith("storage.ts"))
  .map(({ file, body }) => ({
    file: sourcePath(file),
    name: /name:\s*"([^"]+)"/.exec(
      body.slice(body.lastIndexOf("storage: gatedStorage") - 300),
    )?.[1],
    body,
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

  it("reports a reset rather than swallowing one", () => {
    const offenders = stores.filter(
      (store) => !store.body.includes("mergePersisted(") && !store.body.includes("unreadable"),
    );
    expect(offenders.map((store) => store.file)).toEqual([]);
  });

  it("labels its own reset with the key it actually writes", () => {
    const offenders = stores.filter((store) => {
      const label = /mergePersisted\(\s*"([^"]+)"/.exec(store.body)?.[1];
      return label !== undefined && label !== store.name;
    });
    expect(offenders.map((store) => store.file)).toEqual([]);
  });

  it("can survive a version it does not recognise", () => {
    const offenders = stores.filter((store) => !store.body.includes("migrate:"));
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

  it("is named in the profile registry", () => {
    const strays: string[] = [];
    for (const file of sourceFiles()) {
      if (file.endsWith("profile.ts") || file.endsWith("backup.ts")) continue;
      const body = readFileSync(file, "utf8");
      for (const match of body.matchAll(/"(lux[.:][a-z.:-]*)"/g)) {
        const literal = match[1];
        if (literal && !covers(literal)) {
          strays.push(`${sourcePath(file)}: ${literal}`);
        }
      }
    }
    expect([...new Set(strays)]).toEqual([]);
  });
});
