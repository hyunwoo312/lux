import { Trophy } from "lucide-react";
import type { WidgetPlugin } from "@/widgets/core/types";
import { SportsWidget } from "@/widgets/sports/SportsWidget";
import { SportsConfig } from "@/widgets/sports/SportsConfig";
import { SportsHeader } from "@/widgets/sports/components/SportsHeader";
import { useSportsViewStore } from "@/widgets/sports/useSportsViewStore";
import { SportsRefreshButton } from "@/widgets/sports/SportsRefreshButton";
import { SPORTS_TINT } from "@/widgets/sports/types";
import { useSportsStore } from "@/widgets/sports/useSportsStore";
import { sportsCommands } from "@/widgets/sports/commands";

export const sportsPlugin: WidgetPlugin = {
  type: "sports",
  name: "Sports",
  category: "information",
  description: "Scores and game details for the teams and leagues you follow",
  icon: Trophy,
  component: SportsWidget,
  commands: sportsCommands,
  clearInstance: (instanceId) => {
    useSportsStore.getState().removeInstance(instanceId);
    useSportsViewStore.getState().reset(instanceId);
  },
  configComponent: SportsConfig,
  statusComponent: SportsHeader,
  headerActionComponent: SportsRefreshButton,
  tint: SPORTS_TINT,
  removalNote: () => "Its league and followed teams will be removed.",
};
