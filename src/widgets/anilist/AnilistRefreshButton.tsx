import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import { ANILIST_SYNC_COOLDOWN_MS, useAnilistStore } from "@/widgets/anilist/useAnilistStore";

export function AnilistRefreshButton() {
  const syncing = useAnilistStore((s) => s.syncing);
  const lastSyncAt = useAnilistStore((s) => s.lastSyncAt);
  const requestSync = useAnilistStore((s) => s.requestSync);

  return (
    <WidgetRefreshButton
      syncing={syncing}
      lastSyncAt={lastSyncAt}
      cooldownMs={ANILIST_SYNC_COOLDOWN_MS}
      onRefresh={() => requestSync()}
    />
  );
}
