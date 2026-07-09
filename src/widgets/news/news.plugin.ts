import { Newspaper } from "lucide-react";
import type { WidgetPlugin } from "@/widgets/core/types";
import { NewsWidget } from "@/widgets/news/NewsWidget";
import { NewsTabs } from "@/widgets/news/NewsTabs";
import { NewsConfig } from "@/widgets/news/NewsConfig";
import { NewsHeaderActions } from "@/widgets/news/NewsHeaderActions";
import { NEWS_ACCENT } from "@/widgets/news/types";

export const newsPlugin: WidgetPlugin = {
  type: "news",
  name: "News",
  description: "Headlines from the sources you choose",
  icon: Newspaper,
  defaultLayout: { w: 7, h: 7, minW: 7, minH: 7, maxW: 14, maxH: 14 },
  component: NewsWidget,
  statusComponent: NewsTabs,
  configComponent: NewsConfig,
  headerActionComponent: NewsHeaderActions,
  accent: NEWS_ACCENT,
};
