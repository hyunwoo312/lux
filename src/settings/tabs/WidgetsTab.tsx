import { SurfaceDefault } from "@/settings/components/SurfaceDefault";
import { RefreshDefaults } from "@/settings/components/RefreshDefaults";
import { ConfigSection, ConfigBody } from "@/components/config/Config";
import { REFRESH, WIDGET_DEFAULTS } from "@/settings/rows";

export function WidgetsTab() {
  return (
    <ConfigBody>
      <ConfigSection title={WIDGET_DEFAULTS.title}>
        <SurfaceDefault />
      </ConfigSection>

      <ConfigSection title={REFRESH.title}>
        <RefreshDefaults />
      </ConfigSection>

      <p className="text-ink-3 text-caption">
        Each widget keeps its own settings behind the gear in its header, on the dashboard.
      </p>
    </ConfigBody>
  );
}
