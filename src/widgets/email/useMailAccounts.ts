import { useConnectedProviders } from "@/integrations";
import { useEmail } from "@/widgets/email/useEmailStore";
import { MAIL_PROVIDERS, type EmailView, type MailProvider } from "@/widgets/email/types";

export function useMailAccounts(): { connected: MailProvider[]; loaded: boolean } {
  return useConnectedProviders(MAIL_PROVIDERS);
}

export function useEmailView(): EmailView {
  const stored = useEmail((d) => d.view);
  const { connected } = useMailAccounts();
  return stored === "all" || connected.includes(stored) ? stored : "all";
}
