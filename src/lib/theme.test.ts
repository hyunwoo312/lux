import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DEFAULT_MODE } from "@/lib/theme";

const preface = readFileSync(
  fileURLToPath(new URL("../../public/theme-init.js", import.meta.url)),
  "utf8",
);

describe("the pre-paint theme preface", () => {
  it("keys off the same storage keys as the app", () => {
    expect(preface).toContain('"lux.theme"');
    expect(preface).toContain('"lux.accent"');
  });

  it("falls back to the same theme the app would choose", () => {
    expect(preface).toContain(`mode = "${DEFAULT_MODE}"`);
  });
});
