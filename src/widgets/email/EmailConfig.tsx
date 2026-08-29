import { Settings2 } from "lucide-react";
import { IconActionButton } from "@/components/IconActionButton";
import {
  ConfigSegmented,
  WidgetConfigGroup,
  WidgetConfigItem,
} from "@/components/config/WidgetConfig";
import { useSettingsStore } from "@/settings";
import { OPEN_BEHAVIOR_OPTIONS } from "@/lib/open-url";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { useEmail, useEmailStore } from "@/widgets/email/useEmailStore";
import { useMailAccounts } from "@/widgets/email/useMailAccounts";
import { BATCH_SIZES, MAIL_PROVIDERS, MAIL_PROVIDER_LABELS } from "@/widgets/email/types";

const BATCH_OPTIONS = BATCH_SIZES.map((value) => ({ value, label: value }));

export function EmailConfig() {
  const instanceId = useWidgetInstanceId();
  const { connected } = useMailAccounts();
  const newTab = useEmail((d) => d.newTab);
  const batch = useEmail((d) => d.batch);
  const setBatch = useEmailStore((s) => s.setBatch);
  const setNewTab = useEmailStore((s) => s.setNewTab);

  const description =
    connected.length === 0
      ? "Not connected — connect a mailbox to see your inbox."
      : `${connected.map((provider) => MAIL_PROVIDER_LABELS[provider]).join(" and ")} connected.`;

  return (
    <>
      <WidgetConfigGroup label="Mailboxes">
        <WidgetConfigItem
          title="Accounts"
          description={description}
          control={
            <IconActionButton
              icon={Settings2}
              label="Manage accounts in Settings"
              tooltip="Manage accounts"
              onClick={() => useSettingsStore.getState().openSettings("accounts")}
            />
          }
        />
        {MAIL_PROVIDERS.filter((provider) => !connected.includes(provider)).map((provider) => (
          <WidgetConfigItem
            key={provider}
            title={MAIL_PROVIDER_LABELS[provider]}
            description={
              provider === "google"
                ? "Gmail needs Chrome with browser sign-in."
                : "Connect Outlook to include its inbox."
            }
          />
        ))}
      </WidgetConfigGroup>

      <WidgetConfigGroup label="Mail">
        <WidgetConfigItem
          title="Messages per load"
          description="How many to fetch each time, including when you scroll for more"
          control={
            <ConfigSegmented
              label="Messages per load"
              value={batch}
              options={BATCH_OPTIONS}
              onChange={(value) => setBatch(instanceId, value)}
            />
          }
        />
        <WidgetConfigItem
          title="Open in"
          description="Where a message opens"
          control={
            <ConfigSegmented
              label="Open messages in"
              value={newTab ? "newTab" : "currentTab"}
              options={OPEN_BEHAVIOR_OPTIONS}
              onChange={(value) => setNewTab(instanceId, value === "newTab")}
            />
          }
        />
      </WidgetConfigGroup>
    </>
  );
}
