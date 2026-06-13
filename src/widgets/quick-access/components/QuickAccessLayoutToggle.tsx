import { LayoutGrid, List } from "lucide-react";
import { ViewToggleButton } from "@/widgets/core/ViewToggleButton";
import { useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";

export function QuickAccessLayoutToggle() {
  const view = useQuickAccessStore((s) => s.view);
  const setView = useQuickAccessStore((s) => s.setView);
  const isGrid = view === "grid";

  return (
    <ViewToggleButton
      targetKey={isGrid ? "list" : "grid"}
      targetLabel={isGrid ? "list view" : "grid view"}
      icon={isGrid ? List : LayoutGrid}
      onToggle={() => setView(isGrid ? "list" : "grid")}
    />
  );
}
