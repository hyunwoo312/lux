import { useCallback } from "react";
import { usePolledResource, type PolledResourceState } from "@/widgets/core/usePolledResource";
import { useWeatherSync } from "@/widgets/weather/hooks/useWeatherSync";
import {
  fetchWeather,
  parseCachedWeather,
  weatherCacheKey,
} from "@/widgets/weather/lib/open-meteo";
import {
  WEATHER_REFRESH_MS,
  type WeatherData,
  type WeatherLocation,
  type WeatherUnits,
  type WeatherWindUnit,
} from "@/widgets/weather/types";

type WeatherResource = {
  state: PolledResourceState<WeatherData>;
  refresh: () => void;
  isRefreshing: boolean;
};

export function useWeatherResource(
  location: WeatherLocation,
  units: WeatherUnits,
  windUnit: WeatherWindUnit,
): WeatherResource {
  const fetcher = useCallback(
    (signal: AbortSignal) => fetchWeather(location, units, windUnit, signal),
    [location, units, windUnit],
  );
  const { state, refresh, isRefreshing, lastSyncedAt } = usePolledResource(fetcher, {
    intervalMs: WEATHER_REFRESH_MS,
    cacheKey: weatherCacheKey(location, units, windUnit),
    persist: true,
    parsePersisted: parseCachedWeather,
  });
  useWeatherSync(refresh, isRefreshing, lastSyncedAt);
  return { state, refresh, isRefreshing };
}
