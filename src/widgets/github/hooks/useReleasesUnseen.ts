import { useProviderAccount } from "@/integrations";
import { usePolledDefinition } from "@/widgets/core/usePolledResource";
import { githubReleases } from "@/widgets/github/lib/resources";
import { countUnseen } from "@/widgets/github/lib/releases-unseen";
import { visibleItems } from "@/widgets/github/lib/visibility";
import { useGithub, useGithubStore } from "@/widgets/github/useGithubStore";

export function useReleasesUnseen(): number {
  const { account } = useProviderAccount("github");
  const connected = account?.status === "connected";
  const showPrivate = useGithub((d) => d.showPrivate);
  const lastSeenAt = useGithubStore((s) =>
    s.lastSeenAccountId === account?.id ? s.lastSeenReleaseAt : undefined,
  );
  const { state } = usePolledDefinition(githubReleases, {
    enabled: connected,
    isEmpty: (data) => data.watchedCount === 0,
  });

  if (state.status !== "success") return 0;
  return countUnseen(visibleItems(state.data.releases, showPrivate), lastSeenAt);
}
