import { X } from "lucide-react";
import { ErrorState } from "@/components/StateMessage";
import { ItemActionButton } from "@/components/ItemActionButton";
import { Skeleton } from "@/components/ui/skeleton";
import { useWeatherResource } from "@/widgets/weather/hooks/useWeatherResource";
import { WeatherCurrent } from "@/widgets/weather/components/WeatherCurrent";
import { WeatherForecast } from "@/widgets/weather/components/WeatherForecast";
import type { WeatherLocation, WeatherUnits, WeatherWindUnit } from "@/widgets/weather/types";

type WeatherDetailProps = {
  location: WeatherLocation;
  units: WeatherUnits;
  windUnit: WeatherWindUnit;
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

export function WeatherDetail({ location, units, windUnit, onRemove }: WeatherDetailProps) {
  const { state, refresh, isRefreshing } = useWeatherResource(location, units, windUnit);
  const data = state.status === "success" ? state.data : null;
  const removeAction = (
    <ItemActionButton
      label={`Remove ${location.name}`}
      onClick={onRemove}
      className="hover:text-destructive absolute top-0 right-0 z-10"
    >
      <X />
    </ItemActionButton>
  );

  return (
    <div className="relative h-full">
      {!data && removeAction}
      {!data ? (
        state.status === "error" ? (
          <ErrorState
            error={state.error}
            service="Open-Meteo"
            subject="the weather"
            onRetry={refresh}
            retrying={isRefreshing}
          />
        ) : (
          <DetailSkeleton />
        )
      ) : (
        <div
          data-weather-scroll
          className="flex h-full flex-col gap-2 overflow-x-hidden scroll-fade overflow-y-auto pb-2"
        >
          <div className="relative shrink-0">
            {removeAction}
            <WeatherCurrent data={data} name={location.name} />
          </div>
          <WeatherForecast data={data} />
        </div>
      )}
    </div>
  );
}
