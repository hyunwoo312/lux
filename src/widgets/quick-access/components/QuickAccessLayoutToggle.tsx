import { LayoutToggle } from "@/widgets/core/LayoutToggle";
import { useQuickAccess, useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function QuickAccessLayoutToggle() {
  const instanceId = useWidgetInstanceId();
  const view = useQuickAccess((d) => d.view);
  const setView = useQuickAccessStore((s) => s.setView);
  return <LayoutToggle value={view} onChange={(next) => setView(instanceId, next)} />;
}
