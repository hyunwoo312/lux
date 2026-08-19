import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { RELEASES } from "../src/changelog/releases.ts";

const fail: string[] = [];
const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
const source = JSON.parse(readFileSync("public/manifest.json", "utf8")) as { version: string };

if (source.version !== pkg.version) {
  fail.push(`public/manifest.json is ${source.version}, package.json is ${pkg.version}`);
}

if (!RELEASES.some((release) => release.version === pkg.version)) {
  fail.push(`src/changelog/releases.ts has no entry for ${pkg.version}`);
}

const strict = process.argv.includes("--strict");

let tags: string[] = [];
if (strict) {
  try {
    tags = execSync("git tag -l", { encoding: "utf8" }).split("\n").filter(Boolean);
  } catch {
    tags = [];
  }
}

if (strict && tags.length > 0) {
  const untagged = RELEASES.filter(
    (release) => release.version !== pkg.version && !tags.includes(`v${release.version}`),
  );
  for (const release of untagged) {
    fail.push(`releases.ts declares ${release.version} but no tag v${release.version} exists`);
  }
}

if (fail.length > 0) {
  process.stderr.write(`verify-release: ${fail.length} problem(s)\n`);
  for (const f of fail) process.stderr.write(`  ${f}\n`);
  process.exit(1);
}

process.stdout.write(
  `verify-release: v${pkg.version} — manifest and changelog entry agree${strict ? "; tags verified" : ""}.\n`,
);
