import { useIntegrationStore } from "@/integrations";
import { usePolledResource } from "@/widgets/core/usePolledResource";
import { fetchInbox, parseCachedInbox } from "@/widgets/github/lib/api/inbox";
import { attentionCount } from "@/widgets/github/lib/inbox-groups";
import { visibleItems } from "@/widgets/github/lib/visibility";
import { useGithub } from "@/widgets/github/useGithubStore";
import { INBOX_CACHE_KEY, INBOX_REFRESH_MS } from "@/widgets/github/types";

export function useInboxAttention(): number {
  const connected = useIntegrationStore(
    (s) => s.accounts.find((entry) => entry.providerId === "github")?.status === "connected",
  );
  const showPrivate = useGithub((d) => d.showPrivate);
  const { state } = usePolledResource(fetchInbox, {
    enabled: connected,
    intervalMs: INBOX_REFRESH_MS,
    cacheKey: INBOX_CACHE_KEY,
    persist: true,
    parsePersisted: parseCachedInbox,
  });

  if (state.status !== "success") return 0;
  return attentionCount(
    visibleItems(state.data.pullRequests, showPrivate),
    visibleItems(state.data.notifications, showPrivate),
  );
}
