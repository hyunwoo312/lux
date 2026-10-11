import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import {
  refreshPolledResource,
  staleSinceOf,
  useFreshness,
  useResourceGroup,
} from "@/widgets/core/usePolledResource";
import { GITHUB_SYNC_COOLDOWN_MS } from "@/widgets/github/useGithubStore";
import { githubContributions, githubInbox, githubReleases } from "@/widgets/github/lib/resources";
import { useAccountResourceKeys } from "@/widgets/core/accountResource";

const RESOURCES = [githubContributions, githubInbox, githubReleases];

export function GithubRefreshButton() {
  const cacheKeys = useAccountResourceKeys(RESOURCES);
  const staleSince = staleSinceOf(useFreshness("github:"));
  const { isRefreshing, lastRequestedAt, lastSyncedAt } = useResourceGroup(cacheKeys);

  return (
    <WidgetRefreshButton
      label="GitHub"
      syncing={isRefreshing}
      lastSyncAt={lastRequestedAt || undefined}
      updatedAt={lastSyncedAt}
      staleSince={staleSince}
      cooldownMs={GITHUB_SYNC_COOLDOWN_MS}
      onRefresh={() => cacheKeys.forEach(refreshPolledResource)}
    />
  );
}
