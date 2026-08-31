import { CloudSun, MapPin } from "lucide-react";
import { instanceData, instanceIds } from "@/widgets/core/instances";
import { needsWidget } from "@/widgets/core/commandSetup";
import type { CommandResult, WidgetCommand } from "@/widgets/core/types";
import { readPolled } from "@/widgets/core/usePolledResource";
import { formatTemperature } from "@/widgets/weather/lib/forecast";
import { searchPlaces } from "@/widgets/weather/lib/open-meteo";
import { weatherForecast } from "@/widgets/weather/lib/resources";
import {
  DEFAULT_DATA,
  useWeatherStore,
  type WeatherConfig,
} from "@/widgets/weather/useWeatherStore";
import { makeLocationId, type WeatherData, type WeatherLocation } from "@/widgets/weather/types";
import { matchesQuery } from "@/widgets/core/commandResult";

type Saved = { instanceId: string; config: WeatherConfig; location: WeatherLocation };

function savedPlaces(): Saved[] {
  const seen = new Set<string>();
  return instanceData("weather", useWeatherStore.getState().byInstance, DEFAULT_DATA).flatMap(
    ({ instanceId, data }) =>
      data.locations.flatMap((location) => {
        if (seen.has(location.id)) return [];
        seen.add(location.id);
        return [{ instanceId, config: data, location }];
      }),
  );
}

function conditions(forecast: WeatherData): string {
  return [
    formatTemperature(forecast.current.temperature),
    `${Math.round(forecast.current.windSpeed)} ${forecast.unitLabels.windSpeed}`,
    `${forecast.current.humidity}% humidity`,
  ].join(" · ");
}

function range(forecast: WeatherData): string {
  return `H ${formatTemperature(forecast.today.max)} · L ${formatTemperature(forecast.today.min)}`;
}

async function savedRow(entry: Saved): Promise<CommandResult> {
  const forecast = await readPolled(
    weatherForecast(entry.location, entry.config.units, entry.config.windUnit),
  ).catch(() => null);

  return {
    id: `weather.place.${entry.location.id}`,
    label: entry.location.name,
    detail: forecast === null ? undefined : conditions(forecast),
    meta: forecast === null ? undefined : range(forecast),
    section: "Your places",
    icon: MapPin,
    run: () => useWeatherStore.getState().selectCity(entry.instanceId, entry.location.id),
  };
}

async function addRows(query: string, signal: AbortSignal): Promise<CommandResult[]> {
  const [instanceId] = instanceIds("weather");
  if (instanceId === undefined) return [];

  const known = new Set(savedPlaces().map((entry) => entry.location.id));
  const places = await searchPlaces(query, signal);

  return places.flatMap((place) => {
    const id = makeLocationId(place.latitude, place.longitude);
    if (known.has(id)) return [];
    return [
      {
        id: `weather.geocode.${place.id}`,
        label: place.name,
        detail: place.label,
        section: "Add a place",
        icon: MapPin,
        run: () =>
          useWeatherStore.getState().addLocation(instanceId, {
            id,
            name: place.name,
            latitude: place.latitude,
            longitude: place.longitude,
          }),
      },
    ];
  });
}

const forecast: WidgetCommand = {
  kind: "provider",
  id: "weather.locations",
  label: "Forecast",
  description: "Check a place you follow, or start following a new one",
  icon: CloudSun,
  keywords: ["weather", "forecast", "temperature", "city", "rain", "add", "location"],
  placeholder: "Search places",
  emptyMessage: (query) =>
    query === "" ? "No places saved yet — type a city name." : `No place matched “${query}”.`,
  search: async (query, signal) => {
    const needle = query.trim();
    const mine = savedPlaces().filter((entry) => matchesQuery(entry.location.name, needle));
    const rows = await Promise.all(mine.map(savedRow));
    return needle === "" ? rows : [...rows, ...(await addRows(needle, signal))];
  },
};

export const weatherCommands = (): WidgetCommand[] => [
  { ...forecast, setup: () => needsWidget("weather", "Weather") },
];
