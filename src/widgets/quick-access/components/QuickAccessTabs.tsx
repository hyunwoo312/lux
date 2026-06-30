import { Bookmark, History, House, Undo2 } from "lucide-react";
import { WidgetTabs, type WidgetTab } from "@/widgets/core/WidgetTabs";
import type { QuickAccessTab } from "@/widgets/quick-access/types";
import { useQuickAccess, useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const TABS: WidgetTab<QuickAccessTab>[] = [
  { value: "home", label: "Home", icon: House },
  { value: "bookmarks", label: "Bookmarks", icon: Bookmark },
  { value: "recentlyClosed", label: "Recent", icon: Undo2 },
  { value: "history", label: "History", icon: History },
];

export function QuickAccessTabs() {
  const instanceId = useWidgetInstanceId();
  const activeTab = useQuickAccess((d) => d.activeTab);
  const setActiveTab = useQuickAccessStore((s) => s.setActiveTab);

  return (
    <WidgetTabs tabs={TABS} value={activeTab} onSelect={(tab) => setActiveTab(instanceId, tab)} />
  );
}
