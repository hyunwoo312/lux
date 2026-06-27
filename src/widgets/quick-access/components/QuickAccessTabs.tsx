import { Bookmark, History, House, Undo2 } from "lucide-react";
import { WidgetTabs, type WidgetTab } from "@/widgets/core/WidgetTabs";
import type { QuickAccessTab } from "@/widgets/quick-access/types";
import { useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";

const TABS: WidgetTab<QuickAccessTab>[] = [
  { value: "home", label: "Home", icon: House },
  { value: "bookmarks", label: "Bookmarks", icon: Bookmark },
  { value: "recentlyClosed", label: "Recent", icon: Undo2 },
  { value: "history", label: "History", icon: History },
];

export function QuickAccessTabs() {
  const activeTab = useQuickAccessStore((s) => s.activeTab);
  const setActiveTab = useQuickAccessStore((s) => s.setActiveTab);

  return <WidgetTabs tabs={TABS} value={activeTab} onSelect={setActiveTab} />;
}
