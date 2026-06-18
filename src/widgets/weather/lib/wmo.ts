import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Moon, Sun } from "lucide-react";
import type { WidgetIcon } from "@/widgets/core/types";

export type WmoInfo = {
  label: string;
  icon: WidgetIcon;
  precipitation: boolean;
};

type Entry = { label: string; day: WidgetIcon; night?: WidgetIcon; precipitation: boolean };

const CLEAR: Entry = { label: "Clear", day: Sun, night: Moon, precipitation: false };
const MAINLY_CLEAR: Entry = { label: "Mainly clear", day: Sun, night: Moon, precipitation: false };
const PARTLY_CLOUDY: Entry = { label: "Partly cloudy", day: CloudSun, night: Cloud, precipitation: false };
const OVERCAST: Entry = { label: "Overcast", day: Cloud, precipitation: false };
const FOG: Entry = { label: "Fog", day: CloudFog, precipitation: false };
const DRIZZLE: Entry = { label: "Drizzle", day: CloudDrizzle, precipitation: true };
const FREEZING_DRIZZLE: Entry = { label: "Freezing drizzle", day: CloudDrizzle, precipitation: true };
const RAIN: Entry = { label: "Rain", day: CloudRain, precipitation: true };
const FREEZING_RAIN: Entry = { label: "Freezing rain", day: CloudRain, precipitation: true };
const SNOW: Entry = { label: "Snow", day: CloudSnow, precipitation: true };
const RAIN_SHOWERS: Entry = { label: "Rain showers", day: CloudRain, precipitation: true };
const SNOW_SHOWERS: Entry = { label: "Snow showers", day: CloudSnow, precipitation: true };
const THUNDERSTORM: Entry = { label: "Thunderstorm", day: CloudLightning, precipitation: true };

const CODES: Record<number, Entry> = {
  0: CLEAR,
  1: MAINLY_CLEAR,
  2: PARTLY_CLOUDY,
  3: OVERCAST,
  45: FOG,
  48: FOG,
  51: DRIZZLE,
  53: DRIZZLE,
  55: DRIZZLE,
  56: FREEZING_DRIZZLE,
  57: FREEZING_DRIZZLE,
  61: RAIN,
  63: RAIN,
  65: RAIN,
  66: FREEZING_RAIN,
  67: FREEZING_RAIN,
  71: SNOW,
  73: SNOW,
  75: SNOW,
  77: SNOW,
  80: RAIN_SHOWERS,
  81: RAIN_SHOWERS,
  82: RAIN_SHOWERS,
  85: SNOW_SHOWERS,
  86: SNOW_SHOWERS,
  95: THUNDERSTORM,
  96: THUNDERSTORM,
  99: THUNDERSTORM,
};

export function isPrecipitationCode(code: number): boolean {
  return CODES[code]?.precipitation ?? false;
}

export function wmoInfo(code: number, isDay: boolean): WmoInfo {
  const entry = CODES[code] ?? OVERCAST;
  const icon = !isDay && entry.night ? entry.night : entry.day;
  return { label: entry.label, icon, precipitation: entry.precipitation };
}
