import { Switch } from "@/components/ui/switch";
import { ConfigSegmented, ConfigSection, ConfigRow } from "@/components/config/Config";
import { OPEN_BEHAVIOR_OPTIONS } from "@/lib/open-url";
import { useQuickAccess, useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

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
    <ConfigSection title="Quick access">
      <ConfigRow
        title="Open in"
        description="Where links open"
        control={
          <ConfigSegmented
            label="Open links in"
            value={openBehavior}
            options={OPEN_BEHAVIOR_OPTIONS}
            onChange={(value) => setOpenBehavior(instanceId, value)}
          />
        }
      />
      <ConfigRow
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
      <ConfigRow
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
      <ConfigRow
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
    </ConfigSection>
  );
}
