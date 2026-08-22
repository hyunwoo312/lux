import { Flame, Newspaper } from "lucide-react";
import { WidgetTabs, type WidgetTab } from "@/widgets/core/WidgetTabs";
import { useNews, useNewsStore } from "@/widgets/news/useNewsStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type { NewsView } from "@/widgets/news/types";

const TABS: WidgetTab<NewsView>[] = [
  { value: "news", label: "News", icon: Newspaper },
  { value: "trending", label: "Trending", icon: Flame },
];

export function NewsTabs() {
  const instanceId = useWidgetInstanceId();
  const view = useNews((d) => d.view);
  const setView = useNewsStore((s) => s.setView);

  return <WidgetTabs tabs={TABS} value={view} onSelect={(next) => setView(instanceId, next)} />;
}
