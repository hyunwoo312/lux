import type { WidgetContentProps } from "@/widgets/core/types";
import { BrowserTab } from "@/widgets/quick-access/components/BrowserTab";
import { HomeTab } from "@/widgets/quick-access/components/HomeTab";
import { useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";

export function QuickAccessWidget({ editing }: WidgetContentProps) {
  const activeTab = useQuickAccessStore((s) => s.activeTab);

  return (
    <div className="h-full">
      {activeTab === "home" ? (
        <HomeTab editing={editing} />
      ) : (
        <BrowserTab tab={activeTab} editing={editing} />
      )}
    </div>
  );
}
