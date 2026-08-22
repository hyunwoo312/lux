import { GitHubServiceIcon } from "@/components/icons/service-icons";
import { Tooltip } from "@/components/ui/tooltip";
import { useGithub, useGithubStore } from "@/widgets/github/useGithubStore";

export function GithubProfileLink() {
  const login = useGithubStore((s) => s.login);
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
