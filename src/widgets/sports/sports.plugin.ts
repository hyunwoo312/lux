import { Trophy } from "lucide-react";
import type { WidgetPlugin } from "@/widgets/core/types";
import { SportsWidget } from "@/widgets/sports/SportsWidget";
import { SportsConfig } from "@/widgets/sports/SportsConfig";
import { SportsTabs } from "@/widgets/sports/components/SportsTabs";
import { SportsRefreshButton } from "@/widgets/sports/SportsRefreshButton";
import { SPORTS_ACCENT } from "@/widgets/sports/types";

export const sportsPlugin: WidgetPlugin = {
  type: "sports",
  name: "Sports",
  category: "information",
  description: "Live and upcoming scores for a league you follow",
  icon: Trophy,
  defaultLayout: { w: 8, h: 8, minW: 8, minH: 8, maxW: 14, maxH: 14 },
  component: SportsWidget,
  configComponent: SportsConfig,
  statusComponent: SportsTabs,
  headerActionComponent: SportsRefreshButton,
  accent: SPORTS_ACCENT,
};
