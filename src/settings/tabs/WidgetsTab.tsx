import { SurfaceDefault } from "@/settings/components/SurfaceDefault";
import { RefreshDefaults } from "@/settings/components/RefreshDefaults";
import { ConfigSection, ConfigBody } from "@/components/config/Config";

export function WidgetsTab() {
  return (
    <ConfigBody>
      <ConfigSection title="Defaults for every widget">
        <SurfaceDefault />
      </ConfigSection>

      <ConfigSection title="Refresh and data">
        <RefreshDefaults />
      </ConfigSection>

      <p className="text-ink-3 text-caption">
        Each widget keeps its own settings behind the gear in its header, on the dashboard.
      </p>
    </ConfigBody>
  );
}
