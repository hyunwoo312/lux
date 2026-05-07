import { BaseWidget } from "@/widgets/core/BaseWidget";
import { CommonWidgetConfig } from "@/widgets/core/CommonWidgetConfig";
import { WidgetConfig } from "@/widgets/core/WidgetConfig";
import type { WidgetInstance } from "@/widgets/core/types";
import { useWidgetBackground } from "@/widgets/core/useWidgetSettingsStore";
import { getWidgetPlugin } from "@/widgets/registry";
import { useDashboardStore } from "@/stores/useDashboardStore";

type WidgetHostProps = {
  instance: WidgetInstance;
  editing: boolean;
  size?: { w: number; h: number };
};

export function WidgetHost({ instance, editing, size }: WidgetHostProps) {
  const removeWidget = useDashboardStore((s) => s.removeWidget);
  const background = useWidgetBackground(instance.type);
  const plugin = getWidgetPlugin(instance.type);
  if (!plugin) return null;

  const accent = plugin.accent ?? "default";

  const Widget = plugin.component;
  const ConfigComponent = plugin.configComponent;
  const StatusComponent = plugin.statusComponent;

  return (
    <BaseWidget
      title={plugin.name}
      editing={editing}
      size={size}
      background={background}
      accent={accent}
      headline={StatusComponent ? <StatusComponent /> : undefined}
      config={
        <WidgetConfig>
          <CommonWidgetConfig type={instance.type} />
          {ConfigComponent && <ConfigComponent />}
        </WidgetConfig>
      }
      onRemove={() => removeWidget(instance.id)}
    >
      <Widget />
    </BaseWidget>
  );
}
