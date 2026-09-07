import { useDashboardStore } from "@/stores/useDashboardStore";
import { showToast } from "@/stores/useToastStore";
import type { WidgetInstance } from "@/widgets/core/types";
import { useWidgetSettingsStore } from "@/widgets/core/useWidgetSettingsStore";
import { getWidgetPlugin } from "@/widgets/registry";

export function removeWidgetInstance(instance: WidgetInstance): void {
  const plugin = getWidgetPlugin(instance.type);
  useDashboardStore.getState().removeWidget(instance.id);
  showToast({
    key: instance.id,
    message: `${plugin.name} removed`,
    note: plugin.removalNote?.(instance.id) ?? undefined,
    action: { kind: "undo", run: () => useDashboardStore.getState().undoRemove() },
    onExpire: () => useDashboardStore.getState().settlePendingRemoval(instance.id),
  });
}

function pruneInstance(instance: WidgetInstance): void {
  getWidgetPlugin(instance.type).clearInstance(instance.id);
  useWidgetSettingsStore.getState().removeInstance(instance.id);
}

export function pruneSettledRemovals(): () => void {
  return useDashboardStore.subscribe((state, previous) => {
    const settled = previous.pendingRemoval?.instance;
    if (!settled || state.pendingRemoval?.instance.id === settled.id) return;
    if (state.widgets.some((widget) => widget.id === settled.id)) return;
    pruneInstance(settled);
  });
}
