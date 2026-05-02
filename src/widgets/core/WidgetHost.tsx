import { BaseWidget } from "@/widgets/core/BaseWidget";
import type { WidgetInstance } from "@/widgets/core/types";
import { getWidgetPlugin } from "@/widgets/registry";
import { useDashboardStore } from "@/stores/useDashboardStore";

type WidgetHostProps = {
  instance: WidgetInstance;
  editing: boolean;
  size?: { w: number; h: number };
};

export function WidgetHost({ instance, editing, size }: WidgetHostProps) {
  const removeWidget = useDashboardStore((s) => s.removeWidget);
  const plugin = getWidgetPlugin(instance.type);
  if (!plugin) return null;

  const Widget = plugin.component;
  return (
    <BaseWidget
      title={plugin.name}
      editing={editing}
      size={size}
      onRemove={() => removeWidget(instance.id)}
    >
      <Widget />
    </BaseWidget>
  );
}
