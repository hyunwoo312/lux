import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sourceFiles, sourcePath } from "@/test/source-files";

function callers(): { file: string; body: string }[] {
  return sourceFiles()
    .filter((file) => !file.includes(join("lib", "net")))
    .map((file) => ({ file: sourcePath(file), body: readFileSync(file, "utf8") }))
    .filter(({ body }) => /\bfetch\(/.test(body));
}

describe("every network call", () => {
  it("carries a timeout", () => {
    const offenders = callers().filter(({ body }) => !body.includes("withTimeout"));
    expect(offenders.map(({ file }) => file)).toEqual([]);
  });

  it("caps any response it reads as text", () => {
    const offenders = callers().filter(({ body }) => /await response\.text\(\)/.test(body));
    expect(offenders.map(({ file }) => file)).toEqual([]);
  });
});
