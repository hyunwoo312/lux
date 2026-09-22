import { useProviderAccount } from "@/integrations";
import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import {
  refreshPolledResource,
  staleSinceOf,
  useFreshness,
  useResourceGroup,
} from "@/widgets/core/usePolledResource";
import { refreshPagedResource } from "@/widgets/core/usePagedResource";
import { anilistKeys } from "@/widgets/anilist/lib/cache-keys";
import { ANILIST_SYNC_COOLDOWN_MS, useAnilist } from "@/widgets/anilist/useAnilistStore";

export function AnilistRefreshButton() {
  const staleSince = staleSinceOf(useFreshness("anilist:"));
  const titleLanguage = useAnilist((d) => d.titleLanguage);
  const discoverFeed = useAnilist((d) => d.discoverFeed);
  const discoverType = useAnilist((d) => d.discoverType);
  const { account } = useProviderAccount("anilist");
  const viewerId = Number(account?.providerAccountId);

  const polled = [
    anilistKeys.discover(titleLanguage, discoverFeed, discoverType),
    anilistKeys.library(viewerId, titleLanguage),
    anilistKeys.unread(viewerId),
  ];
  const paged = [
    anilistKeys.activity(viewerId, titleLanguage),
    anilistKeys.inbox(viewerId, titleLanguage),
  ];
  const { isRefreshing, lastRequestedAt, lastSyncedAt } = useResourceGroup([...polled, ...paged]);

  return (
    <WidgetRefreshButton
      label="AniList"
      syncing={isRefreshing}
      lastSyncAt={lastRequestedAt || undefined}
      updatedAt={lastSyncedAt}
      staleSince={staleSince}
      cooldownMs={ANILIST_SYNC_COOLDOWN_MS}
      onRefresh={() => {
        polled.forEach(refreshPolledResource);
        paged.forEach(refreshPagedResource);
      }}
    />
  );
}
