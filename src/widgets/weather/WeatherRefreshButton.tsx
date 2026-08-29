import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import { useFreshness } from "@/widgets/core/usePolledResource";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { useWeatherSyncStatus } from "@/widgets/weather/hooks/useWeatherSync";
import {
  WEATHER_SYNC_COOLDOWN_MS,
  useWeather,
  useWeatherStore,
} from "@/widgets/weather/useWeatherStore";

export function WeatherRefreshButton() {
  const freshness = useFreshness("weather:");
  const instanceId = useWidgetInstanceId();
  const locations = useWeather((d) => d.locations);
  const status = useWeatherSyncStatus();
  const requestSync = useWeatherStore((s) => s.requestSync);

  if (locations.length === 0) return null;

  return (
    <WidgetRefreshButton
      label="Weather"
      {...status}
      freshness={freshness}
      cooldownMs={WEATHER_SYNC_COOLDOWN_MS}
      onRefresh={() => requestSync(instanceId)}
    />
  );
}
