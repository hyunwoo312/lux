import { useGrantedPermissions } from "@/hooks/usePermission";
import { isPermissionsManageable } from "@/lib/permissions";
import { SECTION_GATE } from "@/widgets/quick-access/lib/gates";
import type { ItemSource } from "@/widgets/quick-access/types";

type GatedSource = Exclude<ItemSource, "history">;

export function useSectionGate(source: GatedSource, enabled: boolean) {
  const granted = useGrantedPermissions();
  const gate = SECTION_GATE[source];
  const missing = gate.permissions.filter((permission) => !granted?.has(permission));
  const blocked = enabled && isPermissionsManageable() && granted !== null && missing.length > 0;
  return { gate, missing, blocked, ready: enabled && granted !== null && !blocked };
}
