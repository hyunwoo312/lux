const CHROME_PREFIX = "lux:";
const LOCAL_PREFIX = "lux.";
const EXCLUDED = new Set(["lux:integrations", "lux:integration-config"]);
const MARKER = "lux-settings-backup";
const BACKUP_VERSION = 2;

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

export async function importSettings(file: File): Promise<void> {
  const parsed = JSON.parse(await file.text()) as Partial<Backup>;
  if (parsed.marker !== MARKER || !parsed.chromeLocal || !parsed.local) {
    throw new Error("Not a valid Lux settings file.");
  }
  if (typeof parsed.version === "number" && parsed.version > BACKUP_VERSION) {
    throw new Error("This backup was created by a newer version of Lux. Update Lux, then try again.");
  }

  const chromeEntries: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.chromeLocal)) {
    if (isBackupKey(key)) chromeEntries[key] = normalizeValue(value);
  }
  await chrome.storage.local.set(chromeEntries);

  for (const [key, value] of Object.entries(parsed.local)) {
    if (key.startsWith(LOCAL_PREFIX) && typeof value === "string") {
      localStorage.setItem(key, value);
    }
  }

  location.reload();
}
