import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import {
  refreshPolledResource,
  staleSinceOf,
  useFreshness,
  useResourceGroup,
} from "@/widgets/core/usePolledResource";
import { weatherCacheKey } from "@/widgets/weather/lib/open-meteo";
import { WEATHER_SYNC_COOLDOWN_MS, useWeather } from "@/widgets/weather/useWeatherStore";

export function WeatherRefreshButton() {
  const staleSince = staleSinceOf(useFreshness("weather:"));
  const locations = useWeather((d) => d.locations);
  const units = useWeather((d) => d.units);
  const windUnit = useWeather((d) => d.windUnit);

  const keys = locations.map((location) => weatherCacheKey(location, units, windUnit));
  const { isRefreshing, lastRequestedAt, lastSyncedAt } = useResourceGroup(keys);

  if (locations.length === 0) return null;

  return (
    <WidgetRefreshButton
      label="Weather"
      syncing={isRefreshing}
      lastSyncAt={lastRequestedAt || undefined}
      updatedAt={lastSyncedAt}
      staleSince={staleSince}
      cooldownMs={WEATHER_SYNC_COOLDOWN_MS}
      onRefresh={() => keys.forEach(refreshPolledResource)}
    />
  );
}
