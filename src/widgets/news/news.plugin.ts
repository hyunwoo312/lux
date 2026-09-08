import { Newspaper } from "lucide-react";
import type { WidgetPlugin } from "@/widgets/core/types";
import { NewsWidget } from "@/widgets/news/NewsWidget";
import { NewsTabs } from "@/widgets/news/NewsTabs";
import { NewsConfig } from "@/widgets/news/NewsConfig";
import { NewsHeaderActions } from "@/widgets/news/NewsHeaderActions";
import { NEWS_TINT, NEWS_REFRESH_MS } from "@/widgets/news/types";
import { useNewsStore } from "@/widgets/news/useNewsStore";
import { newsCommands } from "@/widgets/news/commands";

export const newsPlugin: WidgetPlugin = {
  type: "news",
  name: "News",
  category: "information",
  description: "Headlines from the sources you choose",
  icon: Newspaper,
  component: NewsWidget,
  commands: newsCommands,
  clearInstance: (instanceId) => useNewsStore.getState().removeInstance(instanceId),
  statusComponent: NewsTabs,
  configComponent: NewsConfig,
  headerActionComponent: NewsHeaderActions,
  refreshMs: NEWS_REFRESH_MS,
  tint: NEWS_TINT,
  removalNote: () => "Its sources, keywords and saved headlines will be removed.",
};
