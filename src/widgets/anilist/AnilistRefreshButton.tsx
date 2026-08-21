import { useIntegrationStore } from "@/integrations";
import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import { useFreshness } from "@/widgets/core/usePolledResource";
import {
  ANILIST_SYNC_COOLDOWN_MS,
  useAnilist,
  useAnilistStore,
} from "@/widgets/anilist/useAnilistStore";

export function AnilistRefreshButton() {
  const freshness = useFreshness("anilist:");
  const syncing = useAnilistStore((s) => s.syncing);
  const lastSyncAt = useAnilistStore((s) => s.lastSyncAt);
  const dataSyncedAt = useAnilistStore((s) => s.dataSyncedAt);
  const requestSync = useAnilistStore((s) => s.requestSync);
  const titleLanguage = useAnilist((d) => d.titleLanguage);
  const viewerId = useIntegrationStore((s) =>
    Number(s.accounts.find((entry) => entry.providerId === "anilist")?.providerAccountId),
  );

  return (
    <WidgetRefreshButton
      label="AniList"
      syncing={syncing}
      lastSyncAt={lastSyncAt}
      updatedAt={dataSyncedAt}
      freshness={freshness}
      cooldownMs={ANILIST_SYNC_COOLDOWN_MS}
      onRefresh={() => requestSync(titleLanguage, viewerId)}
    />
  );
}
