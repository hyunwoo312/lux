import { WidgetRefreshButton } from "@/widgets/core/WidgetRefreshButton";
import { staleSinceOf, useFreshness } from "@/widgets/core/usePolledResource";
import { GITHUB_SYNC_COOLDOWN_MS, useGithubStore } from "@/widgets/github/useGithubStore";
import { useGithubSyncStatus } from "@/widgets/github/useGithubSync";

export function GithubRefreshButton() {
  const staleSince = staleSinceOf(useFreshness("github:"));
  const status = useGithubSyncStatus();
  const requestSync = useGithubStore((s) => s.requestSync);

  return (
    <WidgetRefreshButton
      label="GitHub"
      {...status}
      staleSince={staleSince}
      cooldownMs={GITHUB_SYNC_COOLDOWN_MS}
      onRefresh={requestSync}
    />
  );
}
