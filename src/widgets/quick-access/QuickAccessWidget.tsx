import type { WidgetContentProps } from "@/widgets/core/types";
import { BrowserTab } from "@/widgets/quick-access/components/BrowserTab";
import { HomeTab } from "@/widgets/quick-access/components/HomeTab";
import { useQuickAccess } from "@/widgets/quick-access/useQuickAccessStore";

export function QuickAccessWidget({ editing }: WidgetContentProps) {
  const activeTab = useQuickAccess((d) => d.activeTab);

  return (
    <div className="relative h-full">
      {activeTab === "home" ? (
        <HomeTab editing={editing} />
      ) : (
        <BrowserTab key={activeTab} tab={activeTab} editing={editing} />
      )}
    </div>
  );
}
