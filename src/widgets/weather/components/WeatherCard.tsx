import { useCallback } from "react";
import { Cloud, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useElementSize } from "@/hooks/useElementSize";
import { usePolledResource, type PolledResourceState } from "@/widgets/core/usePolledResource";
import { useWeatherSync } from "@/widgets/weather/hooks/useWeatherSync";
import { forecastVisibility, formatTemperature } from "@/widgets/weather/lib/forecast";
import { fetchWeather, parseCachedWeather } from "@/widgets/weather/lib/open-meteo";
import { WeatherCurrent } from "@/widgets/weather/components/WeatherCurrent";
import { WeatherForecast } from "@/widgets/weather/components/WeatherForecast";
import { WeatherIcon } from "@/widgets/weather/components/WeatherIcon";
import type { WeatherData, WeatherLocation, WeatherUnits } from "@/widgets/weather/types";

const REFRESH_MS = 10 * 60 * 1000;

type WeatherCardProps = {
  location: WeatherLocation;
  units: WeatherUnits;
  mode: "compact" | "detailed";
  onSelect?: () => void;
  onRemove: () => void;
};

function RemoveButton({
  name,
  onRemove,
  className,
}: {
  name: string;
  onRemove: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={`Remove ${name}`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onRemove();
      }}
      className={cn(
        `
          text-muted-foreground/60
          hover:text-destructive
          grid size-7 shrink-0 place-items-center transition
          [&_svg]:size-4
        `,
        className,
      )}
    >
      <X />
    </button>
  );
}

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
      <RemoveButton name={name} onRemove={onRemove} className="absolute top-0 right-0 z-10" />
      {!data ? (
        state.status === "error" ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-2 text-center">
            <p className="text-muted-foreground text-sm">Couldn’t load the weather.</p>
            <Button size="sm" variant="outline" onClick={onRetry} disabled={refreshing}>
              {refreshing ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Retrying…
                </>
              ) : (
                "Retry"
              )}
            </Button>
          </div>
        ) : (
          <DetailSkeleton />
        )
      ) : (
        <div ref={ref} className="flex h-full flex-col gap-2 overflow-hidden">
          <div ref={currentRef}>
            <WeatherCurrent data={data} name={name} />
          </div>
          {(showHourly || showDaily) && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <WeatherForecast data={data} showHourly={showHourly} showDaily={showDaily} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function WeatherCard({ location, units, mode, onSelect, onRemove }: WeatherCardProps) {
  const fetcher = useCallback(
    (signal: AbortSignal) => fetchWeather(location, units, signal),
    [location, units],
  );
  const { state, refresh, isRefreshing, lastSyncedAt } = usePolledResource(fetcher, {
    intervalMs: REFRESH_MS,
    cacheKey: `weather:${location.latitude},${location.longitude},${units}`,
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
    <div
      className="
        group
        hover:bg-foreground/5
        relative flex items-center rounded-lg px-2 py-1.5 transition-colors
      "
    >
      <button
        type="button"
        onClick={onSelect}
        className="
          flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left outline-none
          transition-[padding] duration-200
          group-hover:pr-9
          group-focus-within:pr-9
          focus-visible:ring-foreground/30 focus-visible:ring-2 focus-visible:ring-inset
        "
        aria-label={`Show ${location.name} forecast`}
      >
        <span className="grid size-7 shrink-0 place-items-center">
          {data ? (
            <WeatherIcon
              code={data.current.weatherCode}
              isDay={data.current.isDay}
              className="text-foreground size-6"
            />
          ) : state.status === "error" ? (
            <Cloud className="text-muted-foreground/50 size-5" aria-hidden />
          ) : (
            <Loader2 className="text-muted-foreground/50 size-4 animate-spin" aria-hidden />
          )}
        </span>
        <span className="text-foreground w-10 shrink-0 text-lg font-semibold tabular-nums">
          {data ? formatTemperature(data.current.temperature) : "—"}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">{location.name}</span>
        {data && (
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {formatTemperature(data.today.max)} / {formatTemperature(data.today.min)}
          </span>
        )}
      </button>
      <RemoveButton
        name={location.name}
        onRemove={onRemove}
        className="
          absolute top-1/2 right-1.5 -translate-y-1/2 translate-x-2 opacity-0 transition
          group-hover:translate-x-0 group-hover:opacity-100
          group-focus-within:translate-x-0 group-focus-within:opacity-100
        "
      />
    </div>
  );
}
