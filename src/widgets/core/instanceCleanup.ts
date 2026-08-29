import type { WidgetInstance } from "@/widgets/core/types";
import { useWidgetSettingsStore } from "@/widgets/core/useWidgetSettingsStore";
import { getWidgetPlugin } from "@/widgets/registry";

export function pruneInstance(instance: WidgetInstance): void {
  getWidgetPlugin(instance.type).clearInstance(instance.id);
  useWidgetSettingsStore.getState().removeInstance(instance.id);
}
