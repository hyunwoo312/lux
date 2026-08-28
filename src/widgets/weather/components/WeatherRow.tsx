import { ROW } from "@/lib/row";
import { Spinner } from "@/components/ui/spinner";
import { CloudOff, X } from "lucide-react";
import { ItemActionButton } from "@/components/ItemActionButton";
import { cn } from "@/lib/utils";
import { TYPE } from "@/lib/type";
import { useWeatherResource } from "@/widgets/weather/hooks/useWeatherResource";
import { formatTemperature } from "@/widgets/weather/lib/forecast";
import { WeatherIcon } from "@/widgets/weather/components/WeatherIcon";
import type { WeatherLocation, WeatherUnits, WeatherWindUnit } from "@/widgets/weather/types";

type WeatherRowProps = {
  location: WeatherLocation;
  units: WeatherUnits;
  windUnit: WeatherWindUnit;
  onSelect: () => void;
  onRemove: () => void;
};

export function WeatherRow({ location, units, windUnit, onSelect, onRemove }: WeatherRowProps) {
  const { state } = useWeatherResource(location, units, windUnit);
  const data = state.status === "success" ? state.data : null;
  const failed = state.status === "error";

  return (
    <div className={cn(ROW.item, "group relative gap-0")}>
      <button
        type="button"
        onClick={onSelect}
        className="
          press-row cursor-pointer focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-lg
          text-left transition-[padding,background-color] duration-200
          group-hover:pr-9
          group-focus-within:pr-9
        "
        aria-label={failed ? `Couldn’t load ${location.name}` : `Show ${location.name} forecast`}
      >
        <span className="grid size-7 shrink-0 place-items-center">
          {data ? (
            <WeatherIcon
              code={data.current.weatherCode}
              isDay={data.current.isDay}
              className="text-ink size-6"
            />
          ) : failed ? (
            <CloudOff className="text-ink-3 size-5" aria-hidden />
          ) : (
            <Spinner className="text-ink-3" />
          )}
        </span>
        <span className="text-ink shrink-0 text-body-lg font-semibold tabular-nums slashed-zero">
          {data ? formatTemperature(data.current.temperature) : "—"}
        </span>
        <span className="min-w-0 flex-1 truncate text-body">{location.name}</span>
        {data && (
          <span
            className={cn(
              TYPE.rowMeta,
              "hidden shrink-0 tabular-nums slashed-zero @[15rem]:inline",
            )}
          >
            {formatTemperature(data.today.max)} / {formatTemperature(data.today.min)}
          </span>
        )}
      </button>
      <ItemActionButton
        label={`Remove ${location.name}`}
        onClick={onRemove}
        className="
          hover:text-destructive
          absolute top-1/2 right-1.5 -translate-y-1/2 translate-x-2 opacity-0 transition
          group-hover:translate-x-0 group-hover:opacity-100
          group-focus-within:translate-x-0 group-focus-within:opacity-100
        "
      >
        <X />
      </ItemActionButton>
    </div>
  );
}
