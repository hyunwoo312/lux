import { GitHubServiceIcon } from "@/components/icons/service-icons";
import { Tooltip } from "@/components/ui/tooltip";
import { useConnectedProviders } from "@/integrations";
import { usePolledDefinition } from "@/widgets/core/usePolledResource";
import { githubContributions } from "@/widgets/github/lib/resources";
import { useGithub } from "@/widgets/github/useGithubStore";

const GITHUB = ["github"] as const;

export function GithubProfileLink() {
  const { connected } = useConnectedProviders(GITHUB);
  const { state } = usePolledDefinition(githubContributions, { enabled: connected.length > 0 });
  const login = state.status === "success" ? state.data.login : undefined;
  const newTab = useGithub((d) => d.openBehavior === "newTab");

  if (!login) {
    return (
      <span className="inline-flex size-7 items-center justify-center">
        <GitHubServiceIcon className="size-4" />
      </span>
    );
  }

  return (
    <Tooltip content="Open profile" sticky>
      <a
        href={`https://github.com/${encodeURIComponent(login)}`}
        target={newTab ? "_blank" : undefined}
        rel="noreferrer"
        aria-label="Open GitHub profile"
        className="
          inline-flex size-7 items-center justify-center rounded-sm opacity-80 transition-opacity
          hover:opacity-100
        "
      >
        <GitHubServiceIcon className="size-4" />
      </a>
    </Tooltip>
  );
}
