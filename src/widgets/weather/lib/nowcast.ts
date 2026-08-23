import type { WeatherMinute } from "@/widgets/weather/types";

const BUCKET_MINUTES = 15;
const DEFAULT_WINDOW_MINUTES = 120;
const DEFAULT_THRESHOLD = 50;

export type Nowcast = {
  startsInMinutes: number;
  probability: number;
  intensity: number;
};

type NowcastOptions = {
  withinMinutes?: number;
  threshold?: number;
};

function isWet(minute: WeatherMinute, threshold: number): boolean {
  return minute.precipitation > 0 || minute.probability >= threshold;
}

export function findNowcast(
  minutes: WeatherMinute[],
  fromIso: string,
  { withinMinutes = DEFAULT_WINDOW_MINUTES, threshold = DEFAULT_THRESHOLD }: NowcastOptions = {},
): Nowcast | null {
  if (minutes.length === 0) return null;
  const next = minutes.findIndex((minute) => minute.time > fromIso.slice(0, 16));
  if (next === -1) return null;
  const start = Math.max(0, next - 1);

  const buckets = Math.max(1, Math.floor(withinMinutes / BUCKET_MINUTES));
  const end = Math.min(start + buckets, minutes.length);
  for (let index = start; index < end; index += 1) {
    const minute = minutes[index];
    if (!minute || !isWet(minute, threshold)) continue;
    return {
      startsInMinutes: (index - start) * BUCKET_MINUTES,
      probability: minute.probability,
      intensity: minute.precipitation,
    };
  }
  return null;
}

export function nowcastLabel(nowcast: Nowcast): string {
  if (nowcast.startsInMinutes <= 0) return "Rain now";
  if (nowcast.startsInMinutes < 60) return `Rain in ~${nowcast.startsInMinutes} min`;
  const hours = Math.round(nowcast.startsInMinutes / 60);
  return `Rain in ~${hours}h`;
}
