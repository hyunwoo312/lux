import { Newspaper } from "lucide-react";
import type { WidgetPlugin } from "@/widgets/core/types";
import { NewsWidget } from "@/widgets/news/NewsWidget";
import { NewsTabs } from "@/widgets/news/NewsTabs";
import { NewsConfig } from "@/widgets/news/NewsConfig";
import { NewsHeaderActions } from "@/widgets/news/NewsHeaderActions";
import { NEWS_TINT, NEWS_REFRESH_MS } from "@/widgets/news/types";
import { useNewsStore } from "@/widgets/news/useNewsStore";

export const newsPlugin: WidgetPlugin = {
  type: "news",
  name: "News",
  category: "information",
  description: "Headlines from the sources you choose",
  icon: Newspaper,
  defaultLayout: { w: 8, h: 8, minW: 8, minH: 8, maxW: 14, maxH: 14 },
  component: NewsWidget,
  clearInstance: (instanceId) => useNewsStore.getState().removeInstance(instanceId),
  statusComponent: NewsTabs,
  configComponent: NewsConfig,
  headerActionComponent: NewsHeaderActions,
  refreshMs: NEWS_REFRESH_MS,
  tint: NEWS_TINT,
};
