import { ConfigSegmented, WidgetConfigGroup, WidgetConfigItem } from "@/widgets/core/WidgetConfig";
import type { OpenBehavior } from "@/widgets/quick-access/types";
import { useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";

const OPEN_OPTIONS: { value: OpenBehavior; label: string }[] = [
  { value: "currentTab", label: "This tab" },
  { value: "newTab", label: "New tab" },
];

export function QuickAccessConfig() {
  const openBehavior = useQuickAccessStore((s) => s.openBehavior);
  const setOpenBehavior = useQuickAccessStore((s) => s.setOpenBehavior);

  return (
    <WidgetConfigGroup label="Quick access">
      <WidgetConfigItem
        title="Open in"
        description="Where links open"
        control={
          <ConfigSegmented
            label="Open links in"
            value={openBehavior}
            options={OPEN_OPTIONS}
            onChange={setOpenBehavior}
          />
        }
      />
    </WidgetConfigGroup>
  );
}
