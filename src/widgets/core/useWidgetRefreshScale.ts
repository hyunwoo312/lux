import { createContext, useContext, useMemo } from "react";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";

export const WidgetTypeContext = createContext<string | null>(null);

export function useWidgetRefreshScale(): number {
  const type = useContext(WidgetTypeContext);

  return useAppSettingsStore((state) => (type === null ? 1 : (state.widgetRefresh[type] ?? 1)));
}

export type ScaledCadence = { staleMs: number; intervalMs: number | undefined };

export function useScaledCadence(staleMs: number, intervalMs: number | undefined): ScaledCadence {
  const scale = useWidgetRefreshScale();

  return useMemo(
    () => ({
      staleMs: staleMs * scale,
      intervalMs: intervalMs === undefined ? undefined : intervalMs * scale,
    }),
    [staleMs, intervalMs, scale],
  );
}
