import { Inbox } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { GmailServiceIcon, OutlookServiceIcon } from "@/components/icons/service-icons";
import { WidgetTabs, type WidgetTab } from "@/widgets/core/WidgetTabs";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { useEmailStore } from "@/widgets/email/useEmailStore";
import { useEmailView, useMailAccounts } from "@/widgets/email/useMailAccounts";
import type { EmailView, MailProvider } from "@/widgets/email/types";
import type { WidgetIcon } from "@/widgets/core/types";

const MAILBOX: Record<MailProvider, { label: string; icon: WidgetIcon }> = {
  google: { label: "Gmail", icon: GmailServiceIcon },
  microsoft: { label: "Outlook", icon: OutlookServiceIcon },
};

export function EmailTabs() {
  const instanceId = useWidgetInstanceId();
  const view = useEmailView();
  const { connected } = useMailAccounts();
  const setView = useEmailStore((s) => s.setView);
  const unread = useEmailStore(useShallow((s) => s.unread));

  const tabs: WidgetTab<EmailView>[] = [
    {
      value: "all",
      label: "All",
      icon: Inbox,
      badge: (unread.google ?? 0) + (unread.microsoft ?? 0),
    },
    ...connected.map((provider) => ({
      value: provider,
      label: MAILBOX[provider].label,
      icon: MAILBOX[provider].icon,
      badge: unread[provider],
    })),
  ];

  return <WidgetTabs tabs={tabs} value={view} onSelect={(next) => setView(instanceId, next)} />;
}
