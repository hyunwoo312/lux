import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CHANGE_TYPE_LABEL,
  CHANGE_TYPE_ORDER,
  RELEASES,
  type Release,
} from "../src/changelog/releases.ts";

const HEADER = `# Changelog

All notable changes to Lux are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
`;

function renderBody(release: Release): string {
  return CHANGE_TYPE_ORDER.flatMap((type) => {
    const items = release.changes.filter((change) => change.type === type);
    if (items.length === 0) return [];
    const lines = items.map((change) => `- ${change.text}`).join("\n");
    return [`### ${CHANGE_TYPE_LABEL[type]}\n\n${lines}`];
  }).join("\n\n");
}

function renderChangelog(): string {
  const entries = RELEASES.map(
    (release) => `## [${release.version}] - ${release.date}\n\n${renderBody(release)}`,
  );
  return `${HEADER}\n${entries.join("\n\n")}\n`;
}

function findRelease(version: string): Release {
  const normalized = version.replace(/^v/, "");
  const release = RELEASES.find((entry) => entry.version === normalized);
  if (!release) {
    process.stderr.write(`No release notes found for version "${version}".\n`);
    process.exit(1);
  }
  return release;
}

const changelogPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", "CHANGELOG.md");
const args = process.argv.slice(2);
const bodyIndex = args.indexOf("--release-body");

if (bodyIndex !== -1) {
  const version = args[bodyIndex + 1];
  if (!version) {
    process.stderr.write("--release-body requires a version argument.\n");
    process.exit(1);
  }
  process.stdout.write(`${renderBody(findRelease(version))}\n`);
} else if (args.includes("--check")) {
  const expected = renderChangelog();
  const actual = readFileSync(changelogPath, "utf8");
  if (actual !== expected) {
    process.stderr.write("CHANGELOG.md is out of date. Run `npm run changelog`.\n");
    process.exit(1);
  }
  process.stderr.write("CHANGELOG.md is up to date.\n");
} else {
  writeFileSync(changelogPath, renderChangelog());
  process.stderr.write(`Wrote ${changelogPath}.\n`);
}
