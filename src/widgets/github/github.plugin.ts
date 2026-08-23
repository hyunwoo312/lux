import { GitHubServiceIcon } from "@/components/icons/service-icons";
import { useProviderLock } from "@/widgets/core/useProviderLock";
import type { WidgetPlugin } from "@/widgets/core/types";
import { GithubWidget } from "@/widgets/github/GithubWidget";
import { GithubConfig } from "@/widgets/github/GithubConfig";
import { GithubHeaderActions } from "@/widgets/github/GithubHeaderActions";
import { GithubTabs } from "@/widgets/github/GithubTabs";
import { GITHUB_ACCENT } from "@/widgets/github/types";

export const githubPlugin: WidgetPlugin = {
  type: "github",
  name: "GitHub",
  category: "productivity",
  description: "Your contributions, notification inbox and watched releases",
  icon: GitHubServiceIcon,
  brandIcon: true,
  defaultLayout: { w: 8, h: 7, minW: 6, minH: 6, maxW: 10, maxH: 10 },
  component: GithubWidget,
  configComponent: GithubConfig,
  statusComponent: GithubTabs,
  headerActionComponent: GithubHeaderActions,
  accent: GITHUB_ACCENT,
  useLock: () =>
    useProviderLock({ providers: ["github"], label: "GitHub", subject: "your activity" }),
  removalNote: () => "Its settings will be reset — your GitHub account stays connected.",
};
