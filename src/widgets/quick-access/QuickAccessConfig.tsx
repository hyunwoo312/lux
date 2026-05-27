import { Switch } from "@/components/ui/switch";
import { ConfigSegmented, WidgetConfigGroup, WidgetConfigItem } from "@/widgets/core/WidgetConfig";
import type { OpenBehavior } from "@/widgets/quick-access/types";
import { useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";

const OPEN_OPTIONS: { value: OpenBehavior; label: string }[] = [
  { value: "currentTab", label: "This tab" },
  { value: "newTab", label: "New tab" },
];

export function QuickAccessConfig() {
  const openBehavior = useQuickAccessStore((s) => s.openBehavior);
  const showTopSites = useQuickAccessStore((s) => s.showTopSites);
  const setOpenBehavior = useQuickAccessStore((s) => s.setOpenBehavior);
  const setShowTopSites = useQuickAccessStore((s) => s.setShowTopSites);

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
      <WidgetConfigItem
        title="Top sites"
        description="Show most-visited sites on the Home tab"
        control={
          <Switch
            checked={showTopSites}
            onCheckedChange={(checked) => setShowTopSites(checked === true)}
            aria-label="Show top sites"
          />
        }
      />
    </WidgetConfigGroup>
  );
}
