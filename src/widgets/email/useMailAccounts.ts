import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useIntegrationStore } from "@/integrations";
import { useEmail } from "@/widgets/email/useEmailStore";
import { MAIL_PROVIDERS, type EmailView, type MailProvider } from "@/widgets/email/types";

export function useMailAccounts(): { connected: MailProvider[]; loaded: boolean } {
  const loaded = useIntegrationStore((s) => s.loaded);
  const load = useIntegrationStore((s) => s.load);
  const connected = useIntegrationStore(
    useShallow((s) =>
      MAIL_PROVIDERS.filter((provider) =>
        s.accounts.some(
          (account) => account.providerId === provider && account.status === "connected",
        ),
      ),
    ),
  );

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  return { connected, loaded };
}

export function useEmailView(): EmailView {
  const stored = useEmail((d) => d.view);
  const { connected } = useMailAccounts();
  return stored === "all" || connected.includes(stored) ? stored : "all";
}
