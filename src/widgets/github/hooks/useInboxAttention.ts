import { useIsConnected } from "@/integrations";
import { usePolledDefinition } from "@/widgets/core/usePolledResource";
import { githubInbox } from "@/widgets/github/lib/resources";
import { attentionCount } from "@/widgets/github/lib/inbox-groups";
import { visibleItems } from "@/widgets/github/lib/visibility";
import { useGithub } from "@/widgets/github/useGithubStore";

export function useInboxAttention(): number {
  const connected = useIsConnected("github");
  const showPrivate = useGithub((d) => d.showPrivate);
  const { state } = usePolledDefinition(githubInbox, { enabled: connected });

  if (state.status !== "success") return 0;
  return attentionCount(
    visibleItems(state.data.pullRequests, showPrivate),
    visibleItems(state.data.notifications, showPrivate),
  );
}
