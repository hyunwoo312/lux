import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import {
  ANILIST_SYNC_COOLDOWN_MS,
  useAnilist,
  useAnilistStore,
} from "@/widgets/anilist/useAnilistStore";

export function AnilistRefreshButton() {
  const syncing = useAnilistStore((s) => s.syncing);
  const lastSyncAt = useAnilistStore((s) => s.lastSyncAt);
  const requestSync = useAnilistStore((s) => s.requestSync);
  const titleLanguage = useAnilist((d) => d.titleLanguage);

  return (
    <WidgetRefreshButton
      syncing={syncing}
      lastSyncAt={lastSyncAt}
      cooldownMs={ANILIST_SYNC_COOLDOWN_MS}
      onRefresh={() => requestSync(titleLanguage)}
    />
  );
}
