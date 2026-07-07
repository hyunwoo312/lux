import { CloudSun } from "lucide-react";
import type { WidgetPlugin } from "@/widgets/core/types";
import { WeatherWidget } from "@/widgets/weather/WeatherWidget";
import { WeatherConfig } from "@/widgets/weather/WeatherConfig";
import { WeatherSearch } from "@/widgets/weather/WeatherSearch";
import { WeatherRefreshButton } from "@/widgets/weather/WeatherRefreshButton";
import { useWeatherStore } from "@/widgets/weather/useWeatherStore";
import { WEATHER_ACCENT } from "@/widgets/weather/types";

export const weatherPlugin: WidgetPlugin = {
  type: "weather",
  name: "Weather",
  icon: CloudSun,
  defaultLayout: { w: 5, h: 5, minW: 5, minH: 5, maxW: 10, maxH: 10 },
  component: WeatherWidget,
  configComponent: WeatherConfig,
  statusComponent: WeatherSearch,
  headerActionComponent: WeatherRefreshButton,
  accent: WEATHER_ACCENT,
  removalNote: (instanceId) => {
    const count = useWeatherStore.getState().byInstance[instanceId]?.locations.length ?? 0;
    if (count === 0) return null;
    return `Your ${count} saved ${count === 1 ? "city" : "cities"} will be deleted.`;
  },
};
