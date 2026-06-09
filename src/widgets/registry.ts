import type { WidgetPlugin, WidgetType } from "@/widgets/core/types";
import { tasksPlugin } from "@/widgets/tasks";
import { quickAccessPlugin } from "@/widgets/quick-access";
import { imagePlugin } from "@/widgets/image";
import { calendarPlugin } from "@/widgets/calendar";
import { spotifyPlugin } from "@/widgets/spotify";

const plugins: Record<WidgetType, WidgetPlugin> = {
  tasks: tasksPlugin,
  quickAccess: quickAccessPlugin,
  image: imagePlugin,
  calendar: calendarPlugin,
  spotify: spotifyPlugin,
};

export const widgetPlugins: WidgetPlugin[] = [
  tasksPlugin,
  quickAccessPlugin,
  imagePlugin,
  calendarPlugin,
  spotifyPlugin,
];

export function getWidgetPlugin(type: WidgetType): WidgetPlugin | undefined {
  return plugins[type];
}
