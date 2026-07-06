import { Settings2 } from "lucide-react";
import { IconActionButton } from "@/components/IconActionButton";
import {
  ConfigSegmented,
  WidgetConfigGroup,
  WidgetConfigItem,
} from "@/components/config/WidgetConfig";
import { useIntegrationStore } from "@/integrations";
import { useSettingsStore } from "@/settings";
import type { OpenBehavior } from "@/lib/open-url";
import { useGithub, useGithubStore } from "@/widgets/github/useGithubStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const OPEN_OPTIONS: { value: OpenBehavior; label: string }[] = [
  { value: "currentTab", label: "This tab" },
  { value: "newTab", label: "New tab" },
];

const PRIVACY_OPTIONS: { value: "all" | "public"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "public", label: "Public only" },
];

export function GithubConfig() {
  const account = useIntegrationStore(
    (s) => s.accounts.find((entry) => entry.providerId === "github") ?? null,
  );
  const instanceId = useWidgetInstanceId();
  const showPrivate = useGithub((d) => d.showPrivate);
  const setShowPrivate = useGithubStore((s) => s.setShowPrivate);
  const openBehavior = useGithub((d) => d.openBehavior);
  const setOpenBehavior = useGithubStore((s) => s.setOpenBehavior);

  const accountDescription = account
    ? account.status === "needsReconnect"
      ? "Reconnect to resume syncing."
      : (account.email ?? account.displayName ?? "Connected")
    : "Not connected — connect to see your activity.";

  return (
    <>
      <WidgetConfigGroup label="Account">
        <WidgetConfigItem
          title="GitHub"
          description={accountDescription}
          control={
            <IconActionButton
              icon={Settings2}
              label={account ? "Manage account" : "Connect in Settings"}
              tooltip={account ? "Manage account" : "Connect in Settings"}
              onClick={() => useSettingsStore.getState().openSettings("accounts")}
            />
          }
        />
      </WidgetConfigGroup>

      <WidgetConfigGroup label="GitHub">
        <WidgetConfigItem
          title="Open in"
          description="Where links open"
          control={
            <ConfigSegmented
              label="Open links in"
              value={openBehavior}
              options={OPEN_OPTIONS}
              onChange={(value) => setOpenBehavior(instanceId, value)}
            />
          }
        />
        <WidgetConfigItem
          title="Repositories"
          description="Include items from private repositories"
          control={
            <ConfigSegmented
              label="Repository visibility"
              value={showPrivate ? "all" : "public"}
              options={PRIVACY_OPTIONS}
              onChange={(value) => setShowPrivate(instanceId, value === "all")}
            />
          }
        />
      </WidgetConfigGroup>
    </>
  );
}
