import { Trophy } from "lucide-react";
import type { WidgetPlugin } from "@/widgets/core/types";
import { SportsWidget } from "@/widgets/sports/SportsWidget";
import { SportsConfig } from "@/widgets/sports/SportsConfig";
import { LeagueMenu } from "@/widgets/sports/components/LeagueMenu";
import { SportsRefreshButton } from "@/widgets/sports/SportsRefreshButton";
import { SPORTS_ACCENT } from "@/widgets/sports/types";

export const sportsPlugin: WidgetPlugin = {
  type: "sports",
  name: "Sports",
  category: "information",
  description: "Live and upcoming scores for a league you follow",
  icon: Trophy,
  defaultLayout: { w: 6, h: 6, minW: 6, minH: 6, maxW: 12, maxH: 12 },
  component: SportsWidget,
  configComponent: SportsConfig,
  statusComponent: LeagueMenu,
  headerActionComponent: SportsRefreshButton,
  accent: SPORTS_ACCENT,
};
