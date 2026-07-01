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
  icon: Newspaper,
  defaultLayout: { w: 6, h: 6, minW: 6, minH: 6, maxW: 12, maxH: 12 },
  component: NewsWidget,
  statusComponent: NewsTabs,
  configComponent: NewsConfig,
  headerActionComponent: NewsHeaderActions,
  accent: NEWS_ACCENT,
};
