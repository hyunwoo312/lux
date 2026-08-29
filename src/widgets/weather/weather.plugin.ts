import { CloudSun } from "lucide-react";
import type { WidgetPlugin } from "@/widgets/core/types";
import { WeatherWidget } from "@/widgets/weather/WeatherWidget";
import { WeatherConfig } from "@/widgets/weather/WeatherConfig";
import { WeatherSearch } from "@/widgets/weather/WeatherSearch";
import { WeatherRefreshButton } from "@/widgets/weather/WeatherRefreshButton";
import { useWeatherStore } from "@/widgets/weather/useWeatherStore";
import { WEATHER_TINT, WEATHER_REFRESH_MS } from "@/widgets/weather/types";

export const weatherPlugin: WidgetPlugin = {
  type: "weather",
  name: "Weather",
  category: "information",
  description: "Current conditions and the days ahead",
  recommended: true,
  icon: CloudSun,
  defaultLayout: { w: 6, h: 6, minW: 6, minH: 6, maxW: 12, maxH: 12 },
  component: WeatherWidget,
  clearInstance: (instanceId) => useWeatherStore.getState().removeInstance(instanceId),
  configComponent: WeatherConfig,
  statusComponent: WeatherSearch,
  headerActionComponent: WeatherRefreshButton,
  refreshMs: WEATHER_REFRESH_MS,
  tint: WEATHER_TINT,
  removalNote: (instanceId) => {
    const count = useWeatherStore.getState().byInstance[instanceId]?.locations.length ?? 0;
    if (count === 0) return null;
    return `Your ${count} saved ${count === 1 ? "city" : "cities"} will be deleted.`;
  },
};
