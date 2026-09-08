import {
  accountFor,
  useConnectedProviders,
  useIntegrationStore,
  type IntegrationProviderId,
} from "@/integrations";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { WidgetLock, WidgetPlugin } from "@/widgets/core/types";

const NO_PROVIDERS: IntegrationProviderId[] = [];

export function useProviderLock(plugin: WidgetPlugin): WidgetLock | null {
  const providers = plugin.requiresAccount ?? NO_PROVIDERS;
  const { connected, loaded } = useConnectedProviders(providers);
  const hasAccount = useIntegrationStore((s) =>
    providers.some((providerId) => accountFor(s.accounts, providerId) !== null),
  );

  const signedOut = plugin.signedOut;
  if (signedOut?.mode !== "lock" || !loaded || connected.length > 0) return null;

  return {
    message: hasAccount
      ? `Reconnect ${signedOut.label} to see ${signedOut.subject}.`
      : `Connect ${signedOut.label} to see ${signedOut.subject}.`,
    actionLabel: hasAccount ? "Reconnect" : "Connect",
    onAction: () => useSettingsStore.getState().openSettings("accounts"),
  };
}
