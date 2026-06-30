import { LayoutGrid, List } from "lucide-react";
import { ViewToggleButton } from "@/widgets/core/ViewToggleButton";
import { useQuickAccess, useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function QuickAccessLayoutToggle() {
  const instanceId = useWidgetInstanceId();
  const view = useQuickAccess((d) => d.view);
  const setView = useQuickAccessStore((s) => s.setView);
  const isGrid = view === "grid";

  return (
    <ViewToggleButton
      targetKey={isGrid ? "list" : "grid"}
      targetLabel={isGrid ? "list view" : "grid view"}
      icon={isGrid ? List : LayoutGrid}
      onToggle={() => setView(instanceId, isGrid ? "list" : "grid")}
    />
  );
}
