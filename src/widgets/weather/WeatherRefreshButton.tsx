import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import {
  WEATHER_SYNC_COOLDOWN_MS,
  useWeather,
  useWeatherStore,
} from "@/widgets/weather/useWeatherStore";

export function WeatherRefreshButton() {
  const instanceId = useWidgetInstanceId();
  const locations = useWeather((d) => d.locations);
  const syncing = useWeatherStore((s) => s.syncing[instanceId] ?? false);
  const lastSyncAt = useWeatherStore((s) => s.lastSyncAt[instanceId]);
  const requestRefresh = useWeatherStore((s) => s.requestRefresh);

  if (locations.length === 0) return null;

  return (
    <WidgetRefreshButton
      syncing={syncing}
      lastSyncAt={lastSyncAt}
      cooldownMs={WEATHER_SYNC_COOLDOWN_MS}
      onRefresh={() => requestRefresh(instanceId)}
    />
  );
}
