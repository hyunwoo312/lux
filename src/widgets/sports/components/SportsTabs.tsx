import { Compass, Star } from "lucide-react";
import { WidgetTabs, type WidgetTab } from "@/widgets/core/WidgetTabs";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { useFollowedCount } from "@/widgets/sports/hooks/useFollowedCount";
import { SPORTS_TABS, type SportsTab } from "@/widgets/sports/types";
import { useSports, useSportsStore } from "@/widgets/sports/useSportsStore";

const LABEL: Record<SportsTab, string> = { discover: "Discover", favorites: "Favorites" };
const ICON = { discover: Compass, favorites: Star } as const;

export function SportsTabs() {
  const instanceId = useWidgetInstanceId();
  const tab = useSports((d) => d.tab);
  const setTab = useSportsStore((s) => s.setTab);
  const followed = useFollowedCount();

  const tabs: WidgetTab<SportsTab>[] = SPORTS_TABS.map((value) => ({
    value,
    label:
      value === "favorites" && followed > 0
        ? `${LABEL[value]} (${followed > 9 ? "9+" : followed})`
        : LABEL[value],
    icon: ICON[value],
  }));

  return <WidgetTabs tabs={tabs} value={tab} onSelect={(next) => setTab(instanceId, next)} />;
}
