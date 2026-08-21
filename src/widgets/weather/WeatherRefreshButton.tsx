import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import { useFreshness } from "@/widgets/core/usePolledResource";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import {
  WEATHER_SYNC_COOLDOWN_MS,
  useWeather,
  useWeatherStore,
} from "@/widgets/weather/useWeatherStore";

export function WeatherRefreshButton() {
  const freshness = useFreshness("weather:");
  const instanceId = useWidgetInstanceId();
  const locations = useWeather((d) => d.locations);
  const syncing = useWeatherStore((s) => (s.syncing[instanceId] ?? 0) > 0);
  const lastSyncAt = useWeatherStore((s) => s.lastSyncAt[instanceId]);
  const dataSyncedAt = useWeatherStore((s) => s.dataSyncedAt[instanceId]);
  const requestRefresh = useWeatherStore((s) => s.requestRefresh);

  if (locations.length === 0) return null;

  return (
    <WidgetRefreshButton
      label="Weather"
      syncing={syncing}
      lastSyncAt={lastSyncAt}
      updatedAt={dataSyncedAt}
      freshness={freshness}
      cooldownMs={WEATHER_SYNC_COOLDOWN_MS}
      onRefresh={() => requestRefresh(instanceId)}
    />
  );
}
