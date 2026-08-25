import { useCallback } from "react";
import { WEATHER_REFRESH_MS } from "@/widgets/weather/types";
import { ROW } from "@/lib/row";
import { Spinner } from "@/components/ui/spinner";
import { RetryButton, StateMessage } from "@/components/StateMessage";
import { Cloud, X } from "lucide-react";
import { ItemActionButton } from "@/components/ItemActionButton";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TYPE } from "@/lib/type";
import { useElementSize } from "@/hooks/useElementSize";
import { usePolledResource, type PolledResourceState } from "@/widgets/core/usePolledResource";
import { useWeatherSync } from "@/widgets/weather/hooks/useWeatherSync";
import { forecastVisibility, formatTemperature } from "@/widgets/weather/lib/forecast";
import {
  fetchWeather,
  parseCachedWeather,
  weatherCacheKey,
} from "@/widgets/weather/lib/open-meteo";
import { WeatherCurrent } from "@/widgets/weather/components/WeatherCurrent";
import { WeatherForecast } from "@/widgets/weather/components/WeatherForecast";
import { WeatherIcon } from "@/widgets/weather/components/WeatherIcon";
import type {
  WeatherData,
  WeatherLocation,
  WeatherUnits,
  WeatherWindUnit,
} from "@/widgets/weather/types";

type WeatherCardProps = {
  location: WeatherLocation;
  units: WeatherUnits;
  windUnit: WeatherWindUnit;
  mode: "compact" | "detailed";
  onSelect?: () => void;
  onRemove: () => void;
};

function DetailSkeleton() {
  return (
    <div className="flex h-full flex-col gap-3">
      <Skeleton className="h-3.5 w-24" />
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="ml-auto flex flex-col items-end gap-1.5">
          <Skeleton className="h-3 w-9" />
          <Skeleton className="h-3 w-9" />
        </div>
      </div>
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

function DetailedWeather({
  state,
  name,
  refreshing,
  onRemove,
  onRetry,
}: {
  state: PolledResourceState<WeatherData>;
  name: string;
  refreshing: boolean;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const [currentRef, currentSize] = useElementSize<HTMLDivElement>();
  const data = state.status === "success" ? state.data : null;
  const { showHourly, showDaily } = forecastVisibility(size.height, currentSize.height);

  return (
    <div className="relative h-full">
      <ItemActionButton
        label={`Remove ${name}`}
        onClick={onRemove}
        className="hover:text-destructive absolute top-0 right-0 z-10"
      >
        <X />
      </ItemActionButton>
      {!data ? (
        state.status === "error" ? (
          <StateMessage
            message="Couldn’t load the weather."
            action={<RetryButton onRetry={onRetry} retrying={refreshing} />}
          />
        ) : (
          <DetailSkeleton />
        )
      ) : (
        <div ref={ref} className="flex h-full flex-col gap-2 overflow-hidden">
          <div ref={currentRef}>
            <WeatherCurrent data={data} name={name} />
          </div>
          {(showHourly || showDaily) && (
            <div className="min-h-0 flex-1 scroll-fade overflow-y-auto">
              <WeatherForecast data={data} showHourly={showHourly} showDaily={showDaily} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function WeatherCard({
  location,
  units,
  windUnit,
  mode,
  onSelect,
  onRemove,
}: WeatherCardProps) {
  const fetcher = useCallback(
    (signal: AbortSignal) => fetchWeather(location, units, windUnit, signal),
    [location, units, windUnit],
  );
  const { state, refresh, isRefreshing, lastSyncedAt } = usePolledResource(fetcher, {
    intervalMs: WEATHER_REFRESH_MS,
    cacheKey: weatherCacheKey(location, units, windUnit),
    persist: true,
    parsePersisted: parseCachedWeather,
  });
  useWeatherSync(refresh, isRefreshing, lastSyncedAt);

  if (mode === "detailed") {
    return (
      <DetailedWeather
        state={state}
        name={location.name}
        refreshing={isRefreshing}
        onRemove={onRemove}
        onRetry={refresh}
      />
    );
  }

  const data = state.status === "success" ? state.data : null;

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
        aria-label={`Show ${location.name} forecast`}
      >
        <span className="grid size-7 shrink-0 place-items-center">
          {data ? (
            <WeatherIcon
              code={data.current.weatherCode}
              isDay={data.current.isDay}
              className="text-ink size-6"
            />
          ) : state.status === "error" ? (
            <Cloud className="text-ink-3 size-5" aria-hidden />
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
