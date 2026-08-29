import { createWidgetSync } from "@/widgets/core/useWidgetSync";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { useWeatherStore } from "@/widgets/weather/useWeatherStore";

export const { useSync: useWeatherSync, useSyncStatus: useWeatherSyncStatus } = createWidgetSync(
  useWeatherStore,
  useWidgetInstanceId,
);
