import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { sourceFiles, sourcePath } from "@/test/source-files";

const ROOT = resolve(import.meta.dirname, "..");

const CANDIDATES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

function resolveAlias(specifier: string): string | null {
  const base = resolve(ROOT, specifier.slice("@/".length));
  for (const suffix of CANDIDATES) {
    const candidate = `${base}${suffix}`;
    if (suffix !== "" && existsSync(candidate)) return candidate;
  }
  return null;
}

function graph(): Map<string, string[]> {
  const edges = new Map<string, string[]>();
  for (const file of sourceFiles()) {
    const body = readFileSync(file, "utf8");
    const targets: string[] = [];
    for (const match of body.matchAll(/import\s+(type\s+)?[^;]*?from\s+"(@\/[^"]+)"/g)) {
      if (match[1] !== undefined) continue;
      const specifier = match[2];
      if (specifier === undefined) continue;
      const target = resolveAlias(specifier);
      if (target !== null && target !== file) targets.push(target);
    }
    edges.set(file, targets);
  }
  return edges;
}

function findCycle(edges: Map<string, string[]>): string[] | null {
  const state = new Map<string, "open" | "done">();
  const trail: string[] = [];

  const walk = (file: string): string[] | null => {
    if (state.get(file) === "done") return null;
    if (state.get(file) === "open") return [...trail.slice(trail.indexOf(file)), file];
    state.set(file, "open");
    trail.push(file);
    for (const next of edges.get(file) ?? []) {
      const cycle = walk(next);
      if (cycle) return cycle;
    }
    trail.pop();
    state.set(file, "done");
    return null;
  };

  for (const file of edges.keys()) {
    const cycle = walk(file);
    if (cycle) return cycle;
  }
  return null;
}

describe("the module graph", () => {
  it("has no runtime import cycles, which silently break store hydration", () => {
    const cycle = findCycle(graph());
    expect(cycle === null ? null : cycle.map(sourcePath).join(" → ")).toBeNull();
  });
});
