import {
  ConfigMultiToggle,
  ConfigSegmented,
  ConfigSelect,
  WidgetConfigGroup,
  WidgetConfigItem,
} from "@/components/config/WidgetConfig";
import { useWeather, useWeatherStore } from "@/widgets/weather/useWeatherStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type {
  WeatherForecastDays,
  WeatherMetric,
  WeatherRainAlert,
  WeatherUnits,
  WeatherWindUnit,
} from "@/widgets/weather/types";

const UNIT_OPTIONS: { value: WeatherUnits; label: string }[] = [
  { value: "imperial", label: "Imperial" },
  { value: "metric", label: "Metric" },
];

const WIND_OPTIONS: { value: WeatherWindUnit; label: string }[] = [
  { value: "auto", label: "Match units" },
  { value: "kmh", label: "km/h" },
  { value: "mph", label: "mph" },
  { value: "ms", label: "m/s" },
  { value: "kn", label: "knots" },
];

const FORECAST_OPTIONS: { value: WeatherForecastDays; label: string }[] = [
  { value: "3", label: "3 days" },
  { value: "5", label: "5 days" },
  { value: "7", label: "7 days" },
];

const RAIN_OPTIONS: { value: WeatherRainAlert; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "chance", label: "Chance" },
  { value: "likely", label: "Likely" },
];

const METRIC_OPTIONS: { value: WeatherMetric; label: string }[] = [
  { value: "feelsLike", label: "Feels like" },
  { value: "humidity", label: "Humidity" },
  { value: "wind", label: "Wind" },
  { value: "uv", label: "UV index" },
  { value: "sunrise", label: "Sunrise" },
  { value: "sunset", label: "Sunset" },
];

export function WeatherConfig() {
  const instanceId = useWidgetInstanceId();
  const units = useWeather((d) => d.units);
  const windUnit = useWeather((d) => d.windUnit);
  const forecastDays = useWeather((d) => d.forecastDays);
  const rainAlert = useWeather((d) => d.rainAlert);
  const metrics = useWeather((d) => d.metrics);
  const setUnits = useWeatherStore((s) => s.setUnits);
  const setWindUnit = useWeatherStore((s) => s.setWindUnit);
  const setForecastDays = useWeatherStore((s) => s.setForecastDays);
  const setRainAlert = useWeatherStore((s) => s.setRainAlert);
  const setMetrics = useWeatherStore((s) => s.setMetrics);

  return (
    <>
      <WidgetConfigGroup label="Units">
        <WidgetConfigItem
          title="Units"
          description="Imperial (°F, mph) or Metric (°C, km/h)"
          control={
            <ConfigSegmented
              label="Units"
              value={units}
              options={UNIT_OPTIONS}
              onChange={(value) => setUnits(instanceId, value)}
            />
          }
        />
        <WidgetConfigItem
          title="Wind speed"
          description="Set wind separately — °C with mph, for instance"
          control={
            <ConfigSelect
              label="Wind speed"
              value={windUnit}
              options={WIND_OPTIONS}
              onChange={(value) => setWindUnit(instanceId, value)}
            />
          }
        />
      </WidgetConfigGroup>

      <WidgetConfigGroup label="Forecast">
        <WidgetConfigItem
          title="Days shown"
          description="How far ahead the daily forecast runs"
          control={
            <ConfigSegmented
              label="Days shown"
              value={forecastDays}
              options={FORECAST_OPTIONS}
              onChange={(value) => setForecastDays(instanceId, value)}
            />
          }
        />
        <WidgetConfigItem
          title="Rain alert"
          description="Warn when rain is close, at 30% or 50% odds"
          control={
            <ConfigSegmented
              label="Rain alert"
              value={rainAlert}
              options={RAIN_OPTIONS}
              onChange={(value) => setRainAlert(instanceId, value)}
            />
          }
        />
      </WidgetConfigGroup>

      <WidgetConfigGroup label="Details">
        <WidgetConfigItem title="Extra readings" description="Shown under the current conditions">
          <ConfigMultiToggle
            label="Extra readings"
            values={metrics}
            options={METRIC_OPTIONS}
            onChange={(values) => setMetrics(instanceId, values)}
          />
        </WidgetConfigItem>
      </WidgetConfigGroup>

      <WidgetConfigGroup label="About">
        <WidgetConfigItem
          title="Weather data"
          description="Provided by Open-Meteo (CC BY 4.0)"
          control={
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noreferrer"
              className="text-ink-3 hover:text-ink text-caption underline underline-offset-2"
            >
              Open-Meteo
            </a>
          }
        />
      </WidgetConfigGroup>
    </>
  );
}
