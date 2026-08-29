import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useIntegrationStore } from "@/integrations/useIntegrationStore";
import type { IntegrationAccountSummary, IntegrationProviderId } from "@/integrations/types";

export function accountFor(
  accounts: readonly IntegrationAccountSummary[],
  providerId: IntegrationProviderId,
): IntegrationAccountSummary | null {
  return accounts.find((account) => account.providerId === providerId) ?? null;
}

export function isConnected(
  accounts: readonly IntegrationAccountSummary[],
  providerId: IntegrationProviderId,
): boolean {
  return accountFor(accounts, providerId)?.status === "connected";
}

export function connectedProviders<T extends IntegrationProviderId>(
  accounts: readonly IntegrationAccountSummary[],
  providers: readonly T[],
): T[] {
  return providers.filter((providerId) => isConnected(accounts, providerId));
}

function useAccountsLoaded(): boolean {
  const loaded = useIntegrationStore((s) => s.loaded);
  const load = useIntegrationStore((s) => s.load);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  return loaded;
}

export function useProviderAccount(providerId: IntegrationProviderId): {
  account: IntegrationAccountSummary | null;
  loaded: boolean;
} {
  const loaded = useAccountsLoaded();
  const account = useIntegrationStore((s) => accountFor(s.accounts, providerId));
  return { account, loaded };
}

export function useIsConnected(providerId: IntegrationProviderId): boolean {
  useAccountsLoaded();
  return useIntegrationStore((s) => isConnected(s.accounts, providerId));
}

export function useConnectedProviders<T extends IntegrationProviderId>(
  providers: readonly T[],
): { connected: T[]; loaded: boolean } {
  const loaded = useAccountsLoaded();
  const connected = useIntegrationStore(
    useShallow((s) => connectedProviders(s.accounts, providers)),
  );
  return { connected, loaded };
}
