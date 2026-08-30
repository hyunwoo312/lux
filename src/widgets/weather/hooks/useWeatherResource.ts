import { usePolledDefinition, type PolledResourceState } from "@/widgets/core/usePolledResource";
import { useWeatherSync } from "@/widgets/weather/hooks/useWeatherSync";
import { weatherForecast } from "@/widgets/weather/lib/resources";
import type {
  WeatherData,
  WeatherLocation,
  WeatherUnits,
  WeatherWindUnit,
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
  const { state, refresh, isRefreshing, lastSyncedAt } = usePolledDefinition(
    weatherForecast(location, units, windUnit),
  );
  useWeatherSync(refresh, isRefreshing, lastSyncedAt);
  return { state, refresh, isRefreshing };
}
