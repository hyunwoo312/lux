import { GitHubServiceIcon } from "@/components/icons/service-icons";
import { Tooltip } from "@/components/ui/tooltip";
import { useGithubStore } from "@/widgets/github/useGithubStore";

export function GithubProfileLink() {
  const login = useGithubStore((s) => s.contributions?.login);
  const newTab = useGithubStore((s) => s.openBehavior === "newTab");

  if (!login) {
    return <GitHubServiceIcon className="size-4" />;
  }

  return (
    <Tooltip content="Open profile" sticky>
      <a
        href={`https://github.com/${encodeURIComponent(login)}`}
        target={newTab ? "_blank" : undefined}
        rel="noreferrer"
        aria-label="Open GitHub profile"
        className="inline-flex opacity-80 transition-opacity hover:opacity-100"
      >
        <GitHubServiceIcon className="size-4" />
      </a>
    </Tooltip>
  );
}
