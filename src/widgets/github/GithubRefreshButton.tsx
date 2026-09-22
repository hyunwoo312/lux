import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import {
  refreshPolledResource,
  staleSinceOf,
  useFreshness,
  useResourceGroup,
} from "@/widgets/core/usePolledResource";
import { GITHUB_SYNC_COOLDOWN_MS } from "@/widgets/github/useGithubStore";
import {
  CONTRIBUTIONS_CACHE_KEY,
  INBOX_CACHE_KEY,
  RELEASES_CACHE_KEY,
} from "@/widgets/github/types";

const CACHE_KEYS = [CONTRIBUTIONS_CACHE_KEY, INBOX_CACHE_KEY, RELEASES_CACHE_KEY];

export function GithubRefreshButton() {
  const staleSince = staleSinceOf(useFreshness("github:"));
  const { isRefreshing, lastRequestedAt, lastSyncedAt } = useResourceGroup(CACHE_KEYS);

  return (
    <WidgetRefreshButton
      label="GitHub"
      syncing={isRefreshing}
      lastSyncAt={lastRequestedAt || undefined}
      updatedAt={lastSyncedAt}
      staleSince={staleSince}
      cooldownMs={GITHUB_SYNC_COOLDOWN_MS}
      onRefresh={() => CACHE_KEYS.forEach(refreshPolledResource)}
    />
  );
}
