import { MousePointer2 } from "lucide-react";
import type { WidgetPlugin } from "@/widgets/core/types";
import { QuickAccessConfig } from "@/widgets/quick-access/QuickAccessConfig";
import { QuickAccessWidget } from "@/widgets/quick-access/QuickAccessWidget";
import { QuickAccessLayoutToggle } from "@/widgets/quick-access/components/QuickAccessLayoutToggle";
import { QuickAccessTabs } from "@/widgets/quick-access/components/QuickAccessTabs";
import { useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";

export const quickAccessPlugin: WidgetPlugin = {
  type: "quickAccess",
  name: "Quick Access",
  icon: MousePointer2,
  defaultLayout: { w: 6, h: 6, minW: 6, minH: 6, maxW: 12, maxH: 12 },
  component: QuickAccessWidget,
  configComponent: QuickAccessConfig,
  statusComponent: QuickAccessTabs,
  headerActionComponent: QuickAccessLayoutToggle,
  accent: "rose",
  removalNote: (instanceId) => {
    const count = useQuickAccessStore.getState().byInstance[instanceId]?.links.length ?? 0;
    if (count === 0) return null;
    return `Your ${count} saved ${count === 1 ? "link" : "links"} will be deleted.`;
  },
};
