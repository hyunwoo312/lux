import { SettingsSection } from "@/settings/components/SettingsSection";
import { SurfaceDefault } from "@/settings/components/SurfaceDefault";
import { RefreshDefaults } from "@/settings/components/RefreshDefaults";

export function WidgetsTab() {
  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title="Defaults for every widget">
        <SurfaceDefault />
      </SettingsSection>

      <SettingsSection title="Refresh and data">
        <RefreshDefaults />
      </SettingsSection>

      <p className="text-ink-3 text-caption">
        Each widget keeps its own settings behind the gear in its header, on the dashboard.
      </p>
    </div>
  );
}
