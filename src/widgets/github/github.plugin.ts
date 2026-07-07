import { GitHubServiceIcon } from "@/components/icons/service-icons";
import type { WidgetPlugin } from "@/widgets/core/types";
import { GithubWidget } from "@/widgets/github/GithubWidget";
import { GithubConfig } from "@/widgets/github/GithubConfig";
import { GithubHeaderActions } from "@/widgets/github/GithubHeaderActions";
import { GithubProfileLink } from "@/widgets/github/GithubProfileLink";

export const githubPlugin: WidgetPlugin = {
  type: "github",
  name: "GitHub",
  icon: GitHubServiceIcon,
  brandIcon: true,
  defaultLayout: { w: 8, h: 7, minW: 5, minH: 5, maxW: 10, maxH: 10 },
  component: GithubWidget,
  configComponent: GithubConfig,
  statusComponent: GithubProfileLink,
  headerActionComponent: GithubHeaderActions,
  accent: "violet",
  removalNote: () => "Its settings will be reset — your GitHub account stays connected.",
};
