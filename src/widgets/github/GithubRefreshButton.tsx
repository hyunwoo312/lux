import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import { GITHUB_SYNC_COOLDOWN_MS, useGithubStore } from "@/widgets/github/useGithubStore";

export function GithubRefreshButton() {
  const syncing = useGithubStore((s) => s.syncing);
  const lastSyncAt = useGithubStore((s) => s.lastSyncAt);
  const requestSync = useGithubStore((s) => s.requestSync);

  return (
    <WidgetRefreshButton
      syncing={syncing}
      lastSyncAt={lastSyncAt}
      cooldownMs={GITHUB_SYNC_COOLDOWN_MS}
      onRefresh={() => requestSync()}
    />
  );
}
