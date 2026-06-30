import { ConfigSegmented, WidgetConfigGroup, WidgetConfigItem } from "@/components/config/WidgetConfig";
import {
  useWidgetBackground,
  useWidgetSettingsStore,
  type WidgetBackground,
} from "@/widgets/core/useWidgetSettingsStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const BACKGROUND_OPTIONS: { value: WidgetBackground; label: string }[] = [
  { value: "glass", label: "Glass" },
  { value: "solid", label: "Solid" },
];

export function CommonWidgetConfig() {
  const id = useWidgetInstanceId();
  const background = useWidgetBackground(id);
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
            onChange={(value) => setBackground(id, value)}
          />
        }
      />
    </WidgetConfigGroup>
  );
}
