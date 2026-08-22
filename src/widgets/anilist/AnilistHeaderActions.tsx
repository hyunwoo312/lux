import { LayoutGrid, List } from "lucide-react";
import { useIntegrationStore } from "@/integrations";
import { ViewToggleButton } from "@/widgets/core/ViewToggleButton";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { AnilistProfileLink } from "@/widgets/anilist/AnilistProfileLink";
import { AnilistRefreshButton } from "@/widgets/anilist/AnilistRefreshButton";
import { useAnilist, useAnilistStore } from "@/widgets/anilist/useAnilistStore";

export function AnilistHeaderActions() {
  const connected = useIntegrationStore(
    (s) => s.accounts.find((entry) => entry.providerId === "anilist")?.status === "connected",
  );
  const instanceId = useWidgetInstanceId();
  const activeTab = useAnilist((d) => d.activeTab);
  const viewMode = useAnilist((d) => d.viewMode);
  const setViewMode = useAnilistStore((s) => s.setViewMode);

  const showsCovers = !connected || activeTab === "library" || activeTab === "discover";
  const nextMode = viewMode === "grid" ? "list" : "grid";

  return (
    <div className="flex items-center gap-0.5">
      {showsCovers && (
        <ViewToggleButton
          targetKey={nextMode}
          targetLabel={nextMode === "grid" ? "cover grid" : "compact list"}
          icon={nextMode === "grid" ? LayoutGrid : List}
          onToggle={() => setViewMode(instanceId, nextMode)}
        />
      )}
      {connected && (
        <>
          <AnilistProfileLink />
          <AnilistRefreshButton />
        </>
      )}
    </div>
  );
}
