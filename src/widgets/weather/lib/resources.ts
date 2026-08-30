import type { PolledDefinition } from "@/widgets/core/usePolledResource";
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

export function weatherForecast(
  location: WeatherLocation,
  units: WeatherUnits,
  windUnit: WeatherWindUnit,
): PolledDefinition<WeatherData> {
  return {
    cacheKey: weatherCacheKey(location, units, windUnit),
    intervalMs: WEATHER_REFRESH_MS,
    parse: parseCachedWeather,
    fetch: (signal) => fetchWeather(location, units, windUnit, signal),
  };
}
