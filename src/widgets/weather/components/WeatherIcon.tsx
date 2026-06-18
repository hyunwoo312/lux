import { cn } from "@/lib/utils";
import { wmoInfo } from "@/widgets/weather/lib/wmo";

type WeatherIconProps = {
  code: number;
  isDay: boolean;
  className?: string;
};

export function WeatherIcon({ code, isDay, className }: WeatherIconProps) {
  const { icon: Icon, label } = wmoInfo(code, isDay);
  return <Icon className={cn("shrink-0", className)} aria-label={label} />;
}
