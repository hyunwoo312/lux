import { Mail } from "lucide-react";
import { useProviderLock } from "@/widgets/core/useProviderLock";
import type { WidgetPlugin } from "@/widgets/core/types";
import { EmailWidget } from "@/widgets/email/EmailWidget";
import { EmailConfig } from "@/widgets/email/EmailConfig";
import { EmailHeaderActions } from "@/widgets/email/EmailHeaderActions";
import { EmailTabs } from "@/widgets/email/EmailTabs";
import { EMAIL_REFRESH_MS, EMAIL_TINT } from "@/widgets/email/types";

export const emailPlugin: WidgetPlugin = {
  type: "email",
  name: "Mail",
  category: "productivity",
  description: "Your Gmail and Outlook inboxes in one list",
  icon: Mail,
  defaultLayout: { w: 8, h: 8, minW: 8, minH: 8, maxW: 14, maxH: 14 },
  component: EmailWidget,
  configComponent: EmailConfig,
  statusComponent: EmailTabs,
  headerActionComponent: EmailHeaderActions,
  refreshMs: EMAIL_REFRESH_MS,
  tint: EMAIL_TINT,
  requiresAccount: ["google", "microsoft"],
  useLock: () =>
    useProviderLock({
      providers: ["google", "microsoft"],
      label: "a mailbox",
      subject: "your inbox",
    }),
  removalNote: () => "Its settings will be reset — your accounts stay connected.",
};
