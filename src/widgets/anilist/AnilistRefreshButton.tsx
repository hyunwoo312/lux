import { useProviderAccount } from "@/integrations";
import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import { useFreshness } from "@/widgets/core/usePolledResource";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { ANILIST_SYNC_COOLDOWN_MS, useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import { useAnilistSyncStatus } from "@/widgets/anilist/useAnilistSync";

export function AnilistRefreshButton() {
  const freshness = useFreshness("anilist:");
  const status = useAnilistSyncStatus();
  const requestSync = useAnilistStore((s) => s.requestSync);
  const instanceId = useWidgetInstanceId();
  const { account } = useProviderAccount("anilist");
  const viewerId = Number(account?.providerAccountId);

  return (
    <WidgetRefreshButton
      label="AniList"
      {...status}
      freshness={freshness}
      cooldownMs={ANILIST_SYNC_COOLDOWN_MS}
      onRefresh={() => requestSync(instanceId, viewerId)}
    />
  );
}
