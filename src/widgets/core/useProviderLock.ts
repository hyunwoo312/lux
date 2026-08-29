import {
  accountFor,
  useConnectedProviders,
  useIntegrationStore,
  type IntegrationProviderId,
} from "@/integrations";
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
  const { connected, loaded } = useConnectedProviders(providers);
  const hasAccount = useIntegrationStore((s) =>
    providers.some((providerId) => accountFor(s.accounts, providerId) !== null),
  );

  if (!loaded || connected.length > 0) return null;

  return {
    message: hasAccount
      ? `Reconnect ${label} to see ${subject}.`
      : `Connect ${label} to see ${subject}.`,
    actionLabel: hasAccount ? "Reconnect" : "Connect",
    onAction: () => useSettingsStore.getState().openSettings("accounts"),
  };
}
