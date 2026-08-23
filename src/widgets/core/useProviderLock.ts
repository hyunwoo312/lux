import { useIntegrationStore, type IntegrationProviderId } from "@/integrations";
import { useSettingsStore } from "@/settings";
import type { WidgetLock } from "@/widgets/core/types";

type ProviderLockOptions = {
  providers: readonly IntegrationProviderId[];
  label: string;
  subject: string;
};

export function useProviderLock({
  providers,
  label,
  subject,
}: ProviderLockOptions): WidgetLock | null {
  const loaded = useIntegrationStore((s) => s.loaded);
  const hasAccount = useIntegrationStore((s) =>
    s.accounts.some((account) => providers.includes(account.providerId)),
  );
  const connected = useIntegrationStore((s) =>
    s.accounts.some(
      (account) => providers.includes(account.providerId) && account.status === "connected",
    ),
  );

  if (!loaded || connected) return null;

  return {
    message: hasAccount
      ? `Reconnect ${label} to see ${subject}.`
      : `Connect ${label} to see ${subject}.`,
    actionLabel: hasAccount ? "Reconnect" : "Connect",
    onAction: () => useSettingsStore.getState().openSettings("accounts"),
  };
}
