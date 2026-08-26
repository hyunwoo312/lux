/// <reference types="node" />
import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

export function sourceFiles(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry) && !entry.includes(".test.")) found.push(full);
    }
  };
  walk(resolve(process.cwd(), "src"));
  return found;
}

export function sourcePath(file: string): string {
  const normalised = file.replace(/\\/g, "/");
  return normalised.split("/src/")[1] ?? normalised;
}
