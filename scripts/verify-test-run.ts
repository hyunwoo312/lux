import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const RESULTS = ".vitest-results.json";
const SRC = "src";

function testFilesOnDisk(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...testFilesOnDisk(full));
    else if (/\.test\.[cm]?[jt]sx?$/.test(entry)) found.push(full);
  }
  return found;
}

type VitestJson = { testResults?: { name: string }[] };

const onDisk = testFilesOnDisk(SRC);
let report: VitestJson;
try {
  report = JSON.parse(readFileSync(RESULTS, "utf8")) as VitestJson;
} catch {
  console.error(`verify-test-run: ${RESULTS} missing or unreadable — did vitest run?`);
  process.exit(1);
}

const ran = new Set((report.testResults ?? []).map((r) => r.name.replace(/\\/g, "/")));
const missed = onDisk.filter((f) => ![...ran].some((r) => r.endsWith(f.replace(/\\/g, "/"))));

if (missed.length > 0) {
  console.error(
    `verify-test-run: ${onDisk.length} test files on disk but ${ran.size} reported by vitest.`,
  );
  console.error("Files vitest did not report:");
  for (const f of missed) console.error(`  ${f}`);
  console.error(
    "\nThis is the silent-drop failure: the summary can look green while files vanish.",
  );
  process.exit(1);
}

process.stdout.write(`verify-test-run: ${ran.size}/${onDisk.length} test files accounted for.\n`);
