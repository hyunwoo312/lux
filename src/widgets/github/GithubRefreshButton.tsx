import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import { useFreshness } from "@/widgets/core/usePolledResource";
import { GITHUB_SYNC_COOLDOWN_MS, useGithubStore } from "@/widgets/github/useGithubStore";

export function GithubRefreshButton() {
  const freshness = useFreshness("github:");
  const syncing = useGithubStore((s) => s.syncing);
  const lastSyncAt = useGithubStore((s) => s.lastSyncAt);
  const dataSyncedAt = useGithubStore((s) => s.dataSyncedAt);
  const requestSync = useGithubStore((s) => s.requestSync);

  return (
    <WidgetRefreshButton
      label="GitHub"
      syncing={syncing}
      lastSyncAt={lastSyncAt}
      updatedAt={dataSyncedAt}
      freshness={freshness}
      cooldownMs={GITHUB_SYNC_COOLDOWN_MS}
      onRefresh={() => requestSync()}
    />
  );
}
