const PROFILE_KEY = "lux:profile";
const NAMESPACE_PREFIX = "lux:";

export const PROFILE_VERSION = 3;

const PRE_LEDGER_VERSION = 1;

export const STORE_KEYS = [
  "app-settings",
  "changelog",
  "dashboard",
  "feedback",
  "settings",
  "shortcuts",
  "wallpaper",
  "widget:anilist",
  "widget:calendar",
  "widget:email",
  "widget:github",
  "widget:image",
  "widget:news",
  "widget:note",
  "widget:quick-access",
  "widget:settings",
  "widget:sports",
  "widget:spotify",
  "widget:stocks",
  "widget:tasks",
  "widget:weather",
] as const;

export const EXTENSION_LOCAL_KEYS = [
  ...STORE_KEYS.map((key) => `${NAMESPACE_PREFIX}${key}`),
  PROFILE_KEY,
  "lux:integrations",
  "lux:integration-config",
  "lux:changelog-pending",
  "lux:reopen-permissions",
];

export const EXTENSION_SESSION_KEYS = ["lux:anilist-callback"];

export const BROWSER_LOCAL_KEYS = [
  "lux.theme",
  "lux.accent",
  "lux.welcome.seen",
  "lux.dashboard.seeded",
  "lux.guide.nudged",
  "lux.wallpaper.newtab-queue",
  "lux.wallpaper.optimized-at",
  "lux.image.newtab-queue",
];

export const BROWSER_LOCAL_PREFIXES = ["lux:polled:", "lux:paged:"];

export const ASSET_DATABASES = ["lux.wallpaper-media", "lux.image-media"];

type Migration = { toVersion: number; run: () => Promise<void> };

async function renameKey(from: string, to: string): Promise<void> {
  const stored = await chrome.storage.local.get([from, to]);
  if (stored[from] === undefined) return;
  if (stored[to] === undefined) await chrome.storage.local.set({ [to]: stored[from] });
  await chrome.storage.local.remove(from);
}

const RELAY_GOOGLE_NOTICE = "Google sign-in moved to Chrome — reconnect to restore your calendar";

async function requireGoogleReconnect(): Promise<void> {
  const key = "lux:integrations";
  const stored = await chrome.storage.local.get(key);
  const blob: unknown = stored[key];
  if (typeof blob !== "object" || blob === null) return;

  const accounts = (blob as { accounts?: unknown }).accounts;
  if (typeof accounts !== "object" || accounts === null) return;

  let changed = false;
  const next: Record<string, unknown> = {};

  for (const [id, value] of Object.entries(accounts as Record<string, unknown>)) {
    const account = value as { providerId?: unknown };
    if (typeof value !== "object" || value === null || account.providerId !== "google") {
      next[id] = value;
      continue;
    }
    const withoutToken = Object.fromEntries(
      Object.entries(value as Record<string, unknown>).filter(([field]) => field !== "token"),
    );
    next[id] = { ...withoutToken, status: "needsReconnect", lastError: RELAY_GOOGLE_NOTICE };
    changed = true;
  }

  if (changed) await chrome.storage.local.set({ [key]: { ...blob, accounts: next } });
}

const MIGRATIONS: Migration[] = [
  {
    toVersion: 2,
    run: async () => {
      await renameKey("lux:lux:feedback", "lux:feedback");
      await renameKey("lux:widget-settings", "lux:widget:settings");
    },
  },
  {
    toVersion: 3,
    run: requireGoogleReconnect,
  },
];

async function readStampedVersion(): Promise<number | null> {
  const stored = await chrome.storage.local.get(PROFILE_KEY);
  const raw: unknown = stored[PROFILE_KEY];
  if (typeof raw !== "object" || raw === null) return null;
  const version = (raw as { version?: unknown }).version;
  return typeof version === "number" && Number.isInteger(version) ? version : null;
}

async function hasEarlierProfile(): Promise<boolean> {
  const stored = await chrome.storage.local.get(null);
  return Object.keys(stored).some((key) => key.startsWith(NAMESPACE_PREFIX) && key !== PROFILE_KEY);
}

export async function upgradeProfile(): Promise<void> {
  const stampedVersion = await readStampedVersion();
  const installedVersion =
    stampedVersion ?? ((await hasEarlierProfile()) ? PRE_LEDGER_VERSION : PROFILE_VERSION);
  if (installedVersion > PROFILE_VERSION) return;

  for (const migration of MIGRATIONS) {
    if (migration.toVersion > installedVersion) await migration.run();
  }
  if (stampedVersion !== PROFILE_VERSION) {
    await chrome.storage.local.set({ [PROFILE_KEY]: { version: PROFILE_VERSION } });
  }
}

let upgrade: Promise<void> | undefined;

export function profileReady(): Promise<void> {
  upgrade ??= upgradeProfile().catch((error: unknown) => {
    console.warn("Profile upgrade did not finish — retrying on next open", error);
  });
  return upgrade;
}
