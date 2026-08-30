import { useDashboardStore } from "@/stores/useDashboardStore";
import type { WidgetType } from "@/widgets/core/types";

export function instanceIds(type: WidgetType): string[] {
  return useDashboardStore
    .getState()
    .widgets.filter((widget) => widget.type === type)
    .map((widget) => widget.id);
}

export function instanceData<T>(
  type: WidgetType,
  byInstance: Record<string, T>,
  fallback: T,
): { instanceId: string; data: T }[] {
  return instanceIds(type).map((instanceId) => ({
    instanceId,
    data: byInstance[instanceId] ?? fallback,
  }));
}
