import { useSyncExternalStore } from "react";
import { getGrantedPermissions, subscribePermissions } from "@/lib/permissions";

export function useGrantedPermissions(): Set<chrome.runtime.ManifestPermission> {
  return useSyncExternalStore(subscribePermissions, getGrantedPermissions, getGrantedPermissions);
}

export function usePermissionGranted(name: chrome.runtime.ManifestPermission): boolean {
  return useGrantedPermissions().has(name);
}
