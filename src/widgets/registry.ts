import type { WidgetPlugin, WidgetType } from "@/widgets/core/types";
import { tasksPlugin } from "@/widgets/tasks";
import { quickAccessPlugin } from "@/widgets/quick-access";
import { imagePlugin } from "@/widgets/image";
import { calendarPlugin } from "@/widgets/calendar";
import { spotifyPlugin } from "@/widgets/spotify";
import { githubPlugin } from "@/widgets/github";
import { weatherPlugin } from "@/widgets/weather";
import { anilistPlugin } from "@/widgets/anilist";
import { notePlugin } from "@/widgets/note";

const plugins: Record<WidgetType, WidgetPlugin> = {
  tasks: tasksPlugin,
  quickAccess: quickAccessPlugin,
  image: imagePlugin,
  calendar: calendarPlugin,
  spotify: spotifyPlugin,
  github: githubPlugin,
  weather: weatherPlugin,
  anilist: anilistPlugin,
  note: notePlugin,
};

export const widgetPlugins: WidgetPlugin[] = Object.values(plugins);

export function getWidgetPlugin(type: WidgetType): WidgetPlugin | undefined {
  return plugins[type];
}
