import { useSyncExternalStore } from "react";
import { getGrantedPermissions, subscribePermissions } from "@/lib/permissions";

export function useGrantedPermissions(): ReadonlySet<chrome.runtime.ManifestPermission> | null {
  return useSyncExternalStore(subscribePermissions, getGrantedPermissions, getGrantedPermissions);
}
