import type { WidgetType } from "@/widgets/core/types";
import { ConfigSegmented, WidgetConfigGroup, WidgetConfigItem } from "@/widgets/core/WidgetConfig";
import {
  useWidgetBackground,
  useWidgetSettingsStore,
  type WidgetBackground,
} from "@/widgets/core/useWidgetSettingsStore";

const BACKGROUND_OPTIONS: { value: WidgetBackground; label: string }[] = [
  { value: "glass", label: "Glass" },
  { value: "solid", label: "Solid" },
];

export function CommonWidgetConfig({ type }: { type: WidgetType }) {
  const background = useWidgetBackground(type);
  const setBackground = useWidgetSettingsStore((s) => s.setBackground);

  return (
    <WidgetConfigGroup label="General">
      <WidgetConfigItem
        title="Background"
        description="Card surface style"
        control={
          <ConfigSegmented
            label="Widget background"
            value={background}
            options={BACKGROUND_OPTIONS}
            onChange={(value) => setBackground(type, value)}
          />
        }
      />
    </WidgetConfigGroup>
  );
}
