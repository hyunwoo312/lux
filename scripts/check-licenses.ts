import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PERMISSIVE_CODE = new Set([
  "MIT",
  "ISC",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "0BSD",
  "CC0-1.0",
  "Unlicense",
  "Python-2.0",
  "BlueOak-1.0.0",
  "MIT-0",
]);

const PERMISSIVE_ASSET = new Set(["OFL-1.1", "CC-BY-4.0"]);

const ALLOWED = new Set([...PERMISSIVE_CODE, ...PERMISSIVE_ASSET]);

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
  dependencies?: Record<string, string>;
};
const runtime = Object.keys(pkg.dependencies ?? {});

function licenseOf(name: string): string {
  const p = join("node_modules", name, "package.json");
  if (!existsSync(p)) return "MISSING";
  const m = JSON.parse(readFileSync(p, "utf8")) as {
    license?: string | { type?: string };
    licenses?: { type?: string }[];
  };
  if (typeof m.license === "string") return m.license;
  if (m.license?.type) return m.license.type;
  if (m.licenses?.[0]?.type) return m.licenses[0].type;
  return "UNKNOWN";
}

function normalise(id: string): string[] {
  return id
    .replace(/[()]/g, "")
    .split(/\s+(?:OR|AND)\s+/i)
    .map((s) => s.trim());
}

const flagged: { name: string; license: string }[] = [];
for (const name of runtime) {
  const id = licenseOf(name);
  const parts = normalise(id);
  if (!parts.some((p) => ALLOWED.has(p))) flagged.push({ name, license: id });
}

if (flagged.length > 0) {
  process.stderr.write(
    `check-licenses: ${flagged.length} runtime dependency licence(s) need review:\n`,
  );
  for (const f of flagged) process.stderr.write(`  ${f.name}: ${f.license}\n`);
  process.stderr.write("\nAdd to the allowlist if compatible, or replace the dependency.\n");
  process.exit(1);
}

process.stdout.write(`check-licenses: ${runtime.length} runtime dependencies, all permissive.\n`);
