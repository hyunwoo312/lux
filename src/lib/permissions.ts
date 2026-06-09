type Listener = () => void;

const listeners = new Set<Listener>();
let granted = new Set<chrome.runtime.ManifestPermission>();
let initialized = false;

export function isPermissionsManageable(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.permissions);
}

function notify() {
  for (const listener of listeners) listener();
}

function refresh() {
  if (!isPermissionsManageable()) return;
  void chrome.permissions.getAll().then((result) => {
    granted = new Set(result.permissions ?? []);
    notify();
  });
}

function ensureInitialized() {
  if (initialized || !isPermissionsManageable()) return;
  initialized = true;
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

export function getGrantedPermissions(): Set<chrome.runtime.ManifestPermission> {
  return granted;
}

export async function setPermissionGranted(
  name: chrome.runtime.ManifestPermission,
  enabled: boolean,
): Promise<void> {
  if (!isPermissionsManageable()) return;
  const update = enabled
    ? chrome.permissions.request({ permissions: [name] })
    : chrome.permissions.remove({ permissions: [name] });
  await update.catch(() => undefined);
}
