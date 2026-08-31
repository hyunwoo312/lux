import { Plus } from "lucide-react";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { SYSTEM_OWNER, type CommandItem } from "@/commands/items";
import { widgetPlugins } from "@/widgets/registry";
import { WIDGET_CATEGORIES, WIDGET_CATEGORY_LABELS } from "@/widgets/core/types";
import { matchesQuery } from "@/widgets/core/commandResult";

export const addWidgetCommand: CommandItem = {
  id: "action.addWidget",
  section: "commands",
  label: "Add a widget",
  meta: SYSTEM_OWNER,
  icon: Plus,
  keywords: ["widget", "new", "place", "dashboard"],
  effect: "scope",
  placeholder: "Choose a widget to add",
  emptyMessage: (query) => `No widget matched “${query}”.`,
  search: async (query) => {
    const needle = query.trim();
    const { widgets, addWidget } = useDashboardStore.getState();

    return WIDGET_CATEGORIES.flatMap((category) =>
      widgetPlugins
        .filter(
          (plugin) =>
            plugin.category === category &&
            matchesQuery(`${plugin.name} ${plugin.description}`, needle),
        )
        .map((plugin) => {
          const placed = widgets.filter((widget) => widget.type === plugin.type).length;
          return {
            id: `widget.${plugin.type}`,
            label: plugin.name,
            detail: plugin.description,
            meta: placed === 0 ? undefined : `${placed} placed`,
            section: WIDGET_CATEGORY_LABELS[category],
            icon: plugin.icon,
            run: () => addWidget(plugin.type),
          };
        }),
    );
  },
};
