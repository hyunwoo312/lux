import type { WidgetPlugin, WidgetType } from "@/widgets/core/types";
import { clockPlugin } from "@/widgets/clock";
import { tasksPlugin } from "@/widgets/tasks";
import { quickAccessPlugin } from "@/widgets/quick-access";

const plugins: Record<WidgetType, WidgetPlugin> = {
  clock: clockPlugin,
  tasks: tasksPlugin,
  quickAccess: quickAccessPlugin,
};

export const widgetPlugins: WidgetPlugin[] = [clockPlugin, tasksPlugin, quickAccessPlugin];

export function getWidgetPlugin(type: WidgetType): WidgetPlugin | undefined {
  return plugins[type];
}
