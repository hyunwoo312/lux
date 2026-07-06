import { useIntegrationStore } from "@/integrations";
import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import {
  ANILIST_SYNC_COOLDOWN_MS,
  useAnilist,
  useAnilistStore,
} from "@/widgets/anilist/useAnilistStore";

export function AnilistRefreshButton() {
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
      syncing={syncing}
      lastSyncAt={lastSyncAt}
      updatedAt={dataSyncedAt}
      cooldownMs={ANILIST_SYNC_COOLDOWN_MS}
      onRefresh={() => requestSync(titleLanguage, viewerId)}
    />
  );
}
