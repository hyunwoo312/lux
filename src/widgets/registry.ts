import type { WidgetPlugin, WidgetType } from "@/widgets/core/types";
import { clockPlugin } from "@/widgets/clock";
import { tasksPlugin } from "@/widgets/tasks";

const plugins: Record<WidgetType, WidgetPlugin> = {
  clock: clockPlugin,
  tasks: tasksPlugin,
};

export const widgetPlugins: WidgetPlugin[] = [clockPlugin, tasksPlugin];

export function getWidgetPlugin(type: WidgetType): WidgetPlugin | undefined {
  return plugins[type];
}
