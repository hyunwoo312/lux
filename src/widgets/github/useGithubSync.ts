import { createWidgetSync } from "@/widgets/core/useWidgetSync";
import { GITHUB_SYNC_KEY, useGithubStore } from "@/widgets/github/useGithubStore";

export const { useSync: useGithubSync, useSyncStatus: useGithubSyncStatus } = createWidgetSync(
  useGithubStore,
  () => GITHUB_SYNC_KEY,
);
