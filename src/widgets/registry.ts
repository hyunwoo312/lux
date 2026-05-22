import type { WidgetPlugin, WidgetType } from "@/widgets/core/types";
import { clockPlugin } from "@/widgets/clock";
import { tasksPlugin } from "@/widgets/tasks";
import { quickAccessPlugin } from "@/widgets/quick-access";
import { imagePlugin } from "@/widgets/image";
import { calendarPlugin } from "@/widgets/calendar";

const plugins: Record<WidgetType, WidgetPlugin> = {
  clock: clockPlugin,
  tasks: tasksPlugin,
  quickAccess: quickAccessPlugin,
  image: imagePlugin,
  calendar: calendarPlugin,
};

export const widgetPlugins: WidgetPlugin[] = [
  clockPlugin,
  tasksPlugin,
  quickAccessPlugin,
  imagePlugin,
  calendarPlugin,
];

export function getWidgetPlugin(type: WidgetType): WidgetPlugin | undefined {
  return plugins[type];
}
