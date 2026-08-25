import { setLocal } from "@/lib/local-store";

const CHROME_PREFIX = "lux:";
const LOCAL_PREFIX = "lux.";
const EXCLUDED = new Set(["lux:integrations", "lux:integration-config"]);
const MARKER = "lux-settings-backup";
const BACKUP_VERSION = 3;
const MAX_BACKUP_BYTES = 8 * 1024 * 1024;

type Backup = {
  marker: string;
  version: number;
  chromeLocal: Record<string, unknown>;
  local: Record<string, string>;
};

function isBackupKey(key: string): boolean {
  return key.startsWith(CHROME_PREFIX) && !EXCLUDED.has(key);
}

function normalizeValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function exportSettings(): Promise<void> {
  const stored = await chrome.storage.local.get(null);
  const chromeLocal: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(stored)) {
    if (isBackupKey(key)) chromeLocal[key] = normalizeValue(value);
  }

  const local: Record<string, string> = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || !key.startsWith(LOCAL_PREFIX)) continue;
    const value = localStorage.getItem(key);
    if (value !== null) local[key] = value;
  }

  const backup: Backup = { marker: MARKER, version: BACKUP_VERSION, chromeLocal, local };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `lux-settings-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function pruneKeysMissingFrom(replacement: Record<string, unknown>): Promise<void> {
  const stored = await chrome.storage.local.get(null);
  const staleChromeKeys = Object.keys(stored).filter(
    (key) => isBackupKey(key) && !(key in replacement),
  );
  if (staleChromeKeys.length > 0) await chrome.storage.local.remove(staleChromeKeys);
}

function pruneLocalKeysMissingFrom(replacement: Record<string, string>): void {
  const staleLocalKeys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(LOCAL_PREFIX) && !(key in replacement)) staleLocalKeys.push(key);
  }
  for (const key of staleLocalKeys) localStorage.removeItem(key);
}

function parseBackupFile(text: string): Partial<Backup> {
  try {
    return JSON.parse(text) as Partial<Backup>;
  } catch {
    throw new Error("Not a valid Lux settings file.");
  }
}

export async function importSettings(file: File): Promise<void> {
  if (file.size > MAX_BACKUP_BYTES) {
    throw new Error("That file is too large to be a Lux settings backup.");
  }
  const parsed = parseBackupFile(await file.text());
  if (parsed.marker !== MARKER || !parsed.chromeLocal || !parsed.local) {
    throw new Error("Not a valid Lux settings file.");
  }
  if (typeof parsed.version === "number" && parsed.version > BACKUP_VERSION) {
    throw new Error(
      "This backup was created by a newer version of Lux. Update Lux, then try again.",
    );
  }

  const chromeEntries: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.chromeLocal)) {
    if (isBackupKey(key)) chromeEntries[key] = normalizeValue(value);
  }
  const localEntries: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed.local)) {
    if (key.startsWith(LOCAL_PREFIX) && typeof value === "string") localEntries[key] = value;
  }

  await chrome.storage.local.set(chromeEntries);
  await pruneKeysMissingFrom(chromeEntries);

  for (const [key, value] of Object.entries(localEntries)) setLocal(key, value);
  pruneLocalKeysMissingFrom(localEntries);

  location.reload();
}
