import { Switch } from "@/components/ui/switch";
import {
  ConfigSegmented,
  WidgetConfigGroup,
  WidgetConfigItem,
} from "@/components/config/WidgetConfig";
import type { OpenBehavior } from "@/widgets/quick-access/types";
import { useQuickAccess, useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const OPEN_OPTIONS: { value: OpenBehavior; label: string }[] = [
  { value: "currentTab", label: "This tab" },
  { value: "newTab", label: "New tab" },
];

export function QuickAccessConfig() {
  const instanceId = useWidgetInstanceId();
  const openBehavior = useQuickAccess((d) => d.openBehavior);
  const showTopSites = useQuickAccess((d) => d.showTopSites);
  const setOpenBehavior = useQuickAccessStore((s) => s.setOpenBehavior);
  const setShowTopSites = useQuickAccessStore((s) => s.setShowTopSites);
  const showOpenTabs = useQuickAccess((d) => d.showOpenTabs);
  const setShowOpenTabs = useQuickAccessStore((s) => s.setShowOpenTabs);
  const showRecentlyClosed = useQuickAccess((d) => d.showRecentlyClosed);
  const setShowRecentlyClosed = useQuickAccessStore((s) => s.setShowRecentlyClosed);

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
            onChange={(value) => setOpenBehavior(instanceId, value)}
          />
        }
      />
      <WidgetConfigItem
        title="Top sites"
        description="Show most-visited sites on the Home tab"
        control={
          <Switch
            checked={showTopSites}
            onCheckedChange={(checked) => setShowTopSites(instanceId, checked === true)}
            aria-label="Show top sites"
          />
        }
      />
      <WidgetConfigItem
        title="Open tabs"
        description="List and manage your open tabs on the Home tab"
        control={
          <Switch
            checked={showOpenTabs}
            onCheckedChange={(checked) => setShowOpenTabs(instanceId, checked === true)}
            aria-label="Show open tabs"
          />
        }
      />
      <WidgetConfigItem
        title="Recently closed"
        description="Reopen tabs you just closed from the Home tab"
        control={
          <Switch
            checked={showRecentlyClosed}
            onCheckedChange={(checked) => setShowRecentlyClosed(instanceId, checked === true)}
            aria-label="Show recently closed tabs"
          />
        }
      />
    </WidgetConfigGroup>
  );
}
