import { GitHubServiceIcon } from "@/components/icons/service-icons";
import { INBOX_REFRESH_MS } from "@/widgets/github/types";
import { useProviderLock } from "@/widgets/core/useProviderLock";
import type { WidgetPlugin } from "@/widgets/core/types";
import { GithubWidget } from "@/widgets/github/GithubWidget";
import { GithubConfig } from "@/widgets/github/GithubConfig";
import { GithubHeaderActions } from "@/widgets/github/GithubHeaderActions";
import { GithubTabs } from "@/widgets/github/GithubTabs";
import { GITHUB_TINT } from "@/widgets/github/types";
import { useGithubStore } from "@/widgets/github/useGithubStore";
import { githubCommands } from "@/widgets/github/commands";

export const githubPlugin: WidgetPlugin = {
  type: "github",
  name: "GitHub",
  category: "productivity",
  description: "Your contributions, notification inbox and watched releases",
  icon: GitHubServiceIcon,
  brandIcon: true,
  component: GithubWidget,
  clearInstance: (instanceId) => useGithubStore.getState().removeInstance(instanceId),
  configComponent: GithubConfig,
  statusComponent: GithubTabs,
  headerActionComponent: GithubHeaderActions,
  refreshMs: INBOX_REFRESH_MS,
  tint: GITHUB_TINT,
  requiresAccount: ["github"],
  commands: githubCommands,
  useLock: () =>
    useProviderLock({ providers: ["github"], label: "GitHub", subject: "your activity" }),
  removalNote: () => "Its settings will be reset — your GitHub account stays connected.",
};
