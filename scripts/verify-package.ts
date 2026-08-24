import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";
const fail: string[] = [];

function read<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

type Manifest = {
  manifest_version?: number;
  name?: string;
  description?: string;
  version?: string;
  minimum_chrome_version?: string;
  permissions?: string[];
  optional_permissions?: string[];
  host_permissions?: string[];
  icons?: Record<string, string>;
  background?: { service_worker?: string };
  content_scripts?: { js?: string[] }[];
  chrome_url_overrides?: Record<string, string>;
};

const pkg = read<{ version: string }>("package.json");
const built = read<Manifest>(join(DIST, "manifest.json"));
const source = read<Manifest>(join("public", "manifest.json"));

if (!pkg) fail.push("package.json is unreadable");
if (!source) fail.push("public/manifest.json is unreadable");
if (!built) fail.push(`${DIST}/manifest.json is missing — run the build first`);

if (pkg && built) {
  if (built.manifest_version !== 3)
    fail.push(`manifest_version is ${built.manifest_version}, expected 3`);
  if (built.version !== pkg.version)
    fail.push(`built manifest is ${built.version}, package.json is ${pkg.version}`);
  for (const key of ["name", "description", "minimum_chrome_version"] as const) {
    if (!built[key]) fail.push(`manifest is missing required field: ${key}`);
  }

  const referenced: string[] = [];
  if (built.background?.service_worker) referenced.push(built.background.service_worker);
  for (const entry of built.content_scripts ?? []) referenced.push(...(entry.js ?? []));
  referenced.push(...Object.values(built.chrome_url_overrides ?? {}));
  referenced.push(...Object.values(built.icons ?? {}));

  for (const rel of referenced) {
    if (!existsSync(join(DIST, rel)))
      fail.push(`manifest references ${rel}, which is not in ${DIST}/`);
  }
}

if (source && built) {
  for (const key of ["permissions", "optional_permissions", "host_permissions"] as const) {
    const a = [...(source[key] ?? [])].sort().join(",");
    const b = [...(built[key] ?? [])].sort().join(",");
    if (a !== b) fail.push(`${key} drifted between public/ and ${DIST}/`);
  }
}

if (fail.length > 0) {
  process.stderr.write(`verify-package: ${fail.length} problem(s)\n`);
  for (const f of fail) process.stderr.write(`  ${f}\n`);
  process.exit(1);
}

const required = built?.permissions?.length ?? 0;
const optional = built?.optional_permissions?.length ?? 0;
process.stdout.write(
  `verify-package: ${DIST}/ ok — MV3, v${built?.version}, ` +
    `${built?.host_permissions?.length ?? 0} hosts, ` +
    `${required + optional} permissions (${required} required, ${optional} optional).\n`,
);
