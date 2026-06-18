import { ConfigSegmented, WidgetConfigGroup, WidgetConfigItem } from "@/components/config/WidgetConfig";
import { useWeatherStore } from "@/widgets/weather/useWeatherStore";
import type { WeatherUnits } from "@/widgets/weather/types";

const UNIT_OPTIONS: { value: WeatherUnits; label: string }[] = [
  { value: "imperial", label: "Imperial" },
  { value: "metric", label: "Metric" },
];

export function WeatherConfig() {
  const units = useWeatherStore((s) => s.units);
  const setUnits = useWeatherStore((s) => s.setUnits);

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
              onChange={setUnits}
            />
          }
        />
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
              className="
                text-muted-foreground
                hover:text-foreground
                text-xs underline underline-offset-2
              "
            >
              Open-Meteo
            </a>
          }
        />
      </WidgetConfigGroup>
    </>
  );
}
