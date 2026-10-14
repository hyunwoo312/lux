import { chartGeometry } from "@/lib/chart";
import { forecastValue, type ForecastMetric } from "@/widgets/weather/lib/forecast-metrics";
import type { WeatherHour } from "@/widgets/weather/types";

export function forecastChart(
  hours: WeatherHour[],
  metric: ForecastMetric,
  width: number,
  height: number,
  selected: WeatherHour | null,
) {
  const values = hours.map((hour) => forecastValue(hour, metric));
  const present = values.filter((value): value is number => value !== null);
  const percent = metric === "rain" || metric === "humidity";
  const geometry = present.length
    ? chartGeometry(percent ? [...present, 0, 100] : present, width, height, {
        inset: 12,
        baseline: metric === "wind" ? 0 : undefined,
      })
    : null;
  const times = hours.map((hour) => Date.parse(`${hour.time}Z`));
  const start = times[0] ?? 0;
  const span = (times.at(-1) ?? start) - start;
  const xFor = (index: number) => {
    const fraction =
      span > 0
        ? ((times[index] ?? start) - start) / span
        : hours.length > 1
          ? index / (hours.length - 1)
          : 0.5;
    return 5 + fraction * Math.max(0, width - 10);
  };
  const indexAt = (x: number) =>
    hours.reduce(
      (nearest, _hour, index) =>
        Math.abs(xFor(index) - x) < Math.abs(xFor(nearest) - x) ? index : nearest,
      0,
    );
  const selectedIndex = Math.max(
    0,
    hours.findIndex((hour) => hour.time === selected?.time),
  );
  const selectedValue = selected ? forecastValue(selected, metric) : null;
  const selection =
    selected && geometry
      ? { x: xFor(selectedIndex), y: selectedValue === null ? null : geometry.yFor(selectedValue) }
      : null;
  const segments: { key: string; points: { x: number; y: number }[] }[] = [];
  if (geometry)
    hours.forEach((hour, index) => {
      const value = values[index];
      if (value === null || value === undefined) return;
      const continuous =
        index > 0 &&
        values[index - 1] !== null &&
        (times[index] ?? 0) - (times[index - 1] ?? 0) === 3600000;
      if (!continuous) segments.push({ key: hour.time, points: [] });
      segments.at(-1)?.points.push({ x: xFor(index), y: geometry.yFor(value) });
    });
  return {
    key: `${metric}-${hours[0]?.time}`,
    hours,
    width,
    height,
    values,
    geometry,
    xFor,
    indexAt,
    selectedIndex,
    selectedValue,
    selection,
    segments,
    hasValues: present.length > 0,
  };
}

export type ForecastChart = ReturnType<typeof forecastChart>;
