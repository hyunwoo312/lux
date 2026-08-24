import { createContext, useContext } from "react";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";

export const WidgetTypeContext = createContext<string | null>(null);

export function useWidgetRefreshScale(): number {
  const type = useContext(WidgetTypeContext);

  return useAppSettingsStore((state) => (type === null ? 1 : (state.widgetRefresh[type] ?? 1)));
}
