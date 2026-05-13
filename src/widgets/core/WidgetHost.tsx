import { BaseWidget } from "@/widgets/core/BaseWidget";
import { CommonWidgetConfig } from "@/widgets/core/CommonWidgetConfig";
import { WidgetConfig } from "@/widgets/core/WidgetConfig";
import type { WidgetInstance } from "@/widgets/core/types";
import { useWidgetBackground } from "@/widgets/core/useWidgetSettingsStore";
import { useWidgetHighlightStore } from "@/widgets/core/useWidgetHighlightStore";
import { getWidgetPlugin } from "@/widgets/registry";
import { useDashboardStore } from "@/stores/useDashboardStore";

type WidgetHostProps = {
  instance: WidgetInstance;
  editing: boolean;
  size?: { w: number; h: number };
};

const useNoBare = () => false;

export function WidgetHost({ instance, editing, size }: WidgetHostProps) {
  const plugin = getWidgetPlugin(instance.type);
  const removeWidget = useDashboardStore((s) => s.removeWidget);
  const background = useWidgetBackground(instance.type);
  const highlighted = useWidgetHighlightStore((s) => s.highlighted === instance.type);
  const useBare = plugin?.useBare ?? useNoBare;
  const bare = useBare();
  if (!plugin) return null;

  const accent = plugin.accent ?? "default";

  const Widget = plugin.component;
  const ConfigComponent = plugin.configComponent;
  const StatusComponent = plugin.statusComponent;
  const HeaderActionComponent = plugin.headerActionComponent;
  const BackdropComponent = plugin.backdropComponent;

  return (
    <BaseWidget
      title={plugin.name}
      editing={editing}
      size={size}
      background={background}
      accent={accent}
      bleed={plugin.bleed}
      bare={bare}
      highlighted={highlighted}
      backdrop={BackdropComponent ? <BackdropComponent /> : undefined}
      headline={StatusComponent ? <StatusComponent /> : undefined}
      headerAction={HeaderActionComponent ? <HeaderActionComponent /> : undefined}
      config={
        <WidgetConfig>
          <CommonWidgetConfig type={instance.type} />
          {ConfigComponent && <ConfigComponent />}
        </WidgetConfig>
      }
      onRemove={() => removeWidget(instance.id)}
    >
      <Widget editing={editing} />
    </BaseWidget>
  );
}
