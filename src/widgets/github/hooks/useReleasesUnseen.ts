import { useIsConnected } from "@/integrations";
import { usePolledResource } from "@/widgets/core/usePolledResource";
import { fetchReleases, parseCachedReleases } from "@/widgets/github/lib/api/releases";
import { countUnseen } from "@/widgets/github/lib/releases-unseen";
import { visibleItems } from "@/widgets/github/lib/visibility";
import { useGithub, useGithubStore } from "@/widgets/github/useGithubStore";
import { RELEASES_CACHE_KEY, SLOW_REFRESH_MS } from "@/widgets/github/types";

export function useReleasesUnseen(): number {
  const connected = useIsConnected("github");
  const showPrivate = useGithub((d) => d.showPrivate);
  const lastSeenAt = useGithubStore((s) => s.lastSeenReleaseAt);
  const { state } = usePolledResource(fetchReleases, {
    enabled: connected,
    intervalMs: SLOW_REFRESH_MS,
    isEmpty: (data) => data.watchedCount === 0,
    cacheKey: RELEASES_CACHE_KEY,
    persist: true,
    parsePersisted: parseCachedReleases,
  });

  if (state.status !== "success") return 0;
  return countUnseen(visibleItems(state.data.releases, showPrivate), lastSeenAt);
}
