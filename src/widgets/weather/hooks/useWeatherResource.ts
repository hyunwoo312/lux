import { usePolledDefinition, type PolledResourceState } from "@/widgets/core/usePolledResource";
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
  const { state, refresh, isRefreshing } = usePolledDefinition(
    weatherForecast(location, units, windUnit),
  );
  return { state, refresh, isRefreshing };
}
