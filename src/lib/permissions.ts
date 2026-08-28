type Listener = () => void;

const listeners = new Set<Listener>();
let granted: ReadonlySet<chrome.runtime.ManifestPermission> | null = null;
let initialized = false;

export function isPermissionsManageable(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.permissions);
}

function notify() {
  for (const listener of listeners) listener();
}

function refresh() {
  void chrome.permissions.getAll().then(
    (result) => {
      granted = new Set(result.permissions ?? []);
      notify();
    },
    () => {
      granted = new Set();
      notify();
    },
  );
}

function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  if (!isPermissionsManageable()) {
    granted = new Set();
    return;
  }
  chrome.permissions.onAdded.addListener(refresh);
  chrome.permissions.onRemoved.addListener(refresh);
  refresh();
}

export function subscribePermissions(listener: Listener): () => void {
  ensureInitialized();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getGrantedPermissions(): ReadonlySet<chrome.runtime.ManifestPermission> | null {
  return granted;
}

ensureInitialized();

const APPLIED_ONLY_AFTER_RELOAD: ReadonlySet<chrome.runtime.ManifestPermission> = new Set(["tabs"]);

const REOPEN_PERMISSIONS_KEY = "lux:reopen-permissions";

function rememberHighlight(name: chrome.runtime.ManifestPermission): void {
  try {
    sessionStorage.setItem(REOPEN_PERMISSIONS_KEY, name);
  } catch {
    return;
  }
}

function reloadPage(reopenSettingsAt: chrome.runtime.ManifestPermission | undefined): void {
  if (reopenSettingsAt) rememberHighlight(reopenSettingsAt);
  window.location.reload();
}

const OPTIONAL_PERMISSIONS: readonly chrome.runtime.ManifestPermission[] = [
  "bookmarks",
  "history",
  "sessions",
  "tabs",
  "topSites",
];

export function takePendingPermissionHighlight(): chrome.runtime.ManifestPermission | null {
  try {
    const pending = sessionStorage.getItem(REOPEN_PERMISSIONS_KEY);
    if (pending) sessionStorage.removeItem(REOPEN_PERMISSIONS_KEY);
    return OPTIONAL_PERMISSIONS.find((name) => name === pending) ?? null;
  } catch {
    return null;
  }
}

export async function setPermissionsGranted(
  names: readonly chrome.runtime.ManifestPermission[],
  enabled: boolean,
  options: { reopenSettings?: boolean } = {},
): Promise<void> {
  if (!isPermissionsManageable()) return;
  const permissions = [...names];
  const update = enabled
    ? chrome.permissions.request({ permissions })
    : chrome.permissions.remove({ permissions });
  const applied = await update.catch(() => false);
  if (!applied) return;
  if (!names.some((name) => APPLIED_ONLY_AFTER_RELOAD.has(name))) return;
  reloadPage(options.reopenSettings ? names[0] : undefined);
}
