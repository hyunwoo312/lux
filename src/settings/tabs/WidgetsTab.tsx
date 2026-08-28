import { SettingsSection } from "@/settings/components/SettingsSection";
import { SettingsTabBody } from "@/settings/components/SettingsTabBody";
import { SurfaceDefault } from "@/settings/components/SurfaceDefault";
import { RefreshDefaults } from "@/settings/components/RefreshDefaults";

export function WidgetsTab() {
  return (
    <SettingsTabBody>
      <SettingsSection title="Defaults for every widget">
        <SurfaceDefault />
      </SettingsSection>

      <SettingsSection title="Refresh and data">
        <RefreshDefaults />
      </SettingsSection>

      <p className="text-ink-3 text-caption">
        Each widget keeps its own settings behind the gear in its header, on the dashboard.
      </p>
    </SettingsTabBody>
  );
}
