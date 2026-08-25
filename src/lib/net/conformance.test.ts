import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("../..", import.meta.url));

function callers(): { file: string; body: string }[] {
  const found: { file: string; body: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry) && !entry.includes(".test.")) {
        const body = readFileSync(full, "utf8");
        if (/\bfetch\(/.test(body) && !full.includes(join("lib", "net"))) {
          found.push({ file: full.split(/[/\\]src[/\\]/)[1] ?? full, body });
        }
      }
    }
  };
  walk(SRC);
  return found;
}

describe("every network call", () => {
  it("carries a timeout", () => {
    const offenders = callers().filter(({ body }) => !body.includes("withTimeout"));
    expect(offenders.map(({ file }) => file)).toEqual([]);
  });

  it("validates its response through the shared taxonomy", () => {
    const offenders = callers().filter(({ body }) => /safeParse\(await response/.test(body));
    expect(offenders.map(({ file }) => file)).toEqual([]);
  });

  it("caps any response it reads as text", () => {
    const offenders = callers().filter(({ body }) => /await response\.text\(\)/.test(body));
    expect(offenders.map(({ file }) => file)).toEqual([]);
  });
});
