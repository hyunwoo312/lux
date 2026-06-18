import type { WidgetPlugin, WidgetType } from "@/widgets/core/types";
import { tasksPlugin } from "@/widgets/tasks";
import { quickAccessPlugin } from "@/widgets/quick-access";
import { imagePlugin } from "@/widgets/image";
import { calendarPlugin } from "@/widgets/calendar";
import { spotifyPlugin } from "@/widgets/spotify";
import { githubPlugin } from "@/widgets/github";
import { weatherPlugin } from "@/widgets/weather";

const plugins: Record<WidgetType, WidgetPlugin> = {
  tasks: tasksPlugin,
  quickAccess: quickAccessPlugin,
  image: imagePlugin,
  calendar: calendarPlugin,
  spotify: spotifyPlugin,
  github: githubPlugin,
  weather: weatherPlugin,
};

export const widgetPlugins: WidgetPlugin[] = [
  tasksPlugin,
  quickAccessPlugin,
  imagePlugin,
  calendarPlugin,
  spotifyPlugin,
  githubPlugin,
  weatherPlugin,
];

export function getWidgetPlugin(type: WidgetType): WidgetPlugin | undefined {
  return plugins[type];
}
