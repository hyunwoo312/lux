import type { WidgetPlugin, WidgetType } from "@/widgets/core/types";
import { clockPlugin } from "@/widgets/clock";

const plugins: Record<WidgetType, WidgetPlugin> = {
  clock: clockPlugin,
};

export function getWidgetPlugin(type: WidgetType): WidgetPlugin | undefined {
  return plugins[type];
}
