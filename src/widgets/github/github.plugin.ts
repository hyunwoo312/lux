import { GitHubServiceIcon } from "@/components/icons/service-icons";
import { useIntegrationStore } from "@/integrations";
import { useSettingsStore } from "@/settings";
import type { WidgetPlugin } from "@/widgets/core/types";
import { GithubWidget } from "@/widgets/github/GithubWidget";
import { GithubConfig } from "@/widgets/github/GithubConfig";
import { GithubHeaderActions } from "@/widgets/github/GithubHeaderActions";
import { GithubProfileLink } from "@/widgets/github/GithubProfileLink";

export const githubPlugin: WidgetPlugin = {
  type: "github",
  name: "GitHub",
  description: "Your contributions and notification inbox",
  icon: GitHubServiceIcon,
  brandIcon: true,
  defaultLayout: { w: 8, h: 7, minW: 5, minH: 5, maxW: 10, maxH: 10 },
  component: GithubWidget,
  configComponent: GithubConfig,
  statusComponent: GithubProfileLink,
  headerActionComponent: GithubHeaderActions,
  accent: "violet",
  useLock: () => {
    const loaded = useIntegrationStore((s) => s.loaded);
    const account = useIntegrationStore(
      (s) => s.accounts.find((entry) => entry.providerId === "github") ?? null,
    );
    if (!loaded || account?.status === "connected") return null;
    return {
      message: account
        ? "Reconnect GitHub to see your activity."
        : "Connect GitHub to see your activity.",
      actionLabel: account ? "Reconnect" : "Connect",
      onAction: () => useSettingsStore.getState().openSettings("accounts"),
    };
  },
  removalNote: () => "Its settings will be reset — your GitHub account stays connected.",
};
