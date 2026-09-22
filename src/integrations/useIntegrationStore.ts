import { create } from "zustand";
import { connectIntegration, disconnectIntegration } from "@/integrations/integration-client";
import { readAccountSummaries, resetAccounts, subscribeAccounts } from "@/integrations/token-store";
import type { IntegrationAccountSummary, IntegrationProviderId } from "@/integrations/types";

type IntegrationStoreState = {
  accounts: IntegrationAccountSummary[];
  unreadable: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  connect: (providerId: IntegrationProviderId) => Promise<void>;
  disconnect: (providerId: IntegrationProviderId) => Promise<void>;
  reset: () => Promise<void>;
};

let loading: Promise<void> | null = null;

export const useIntegrationStore = create<IntegrationStoreState>()((set, get) => ({
  accounts: [],
  unreadable: false,
  loaded: false,
  load: () => {
    loading ??= readAccountSummaries()
      .then(({ accounts, unreadable }) => set({ accounts, unreadable, loaded: true }))
      .finally(() => {
        loading = null;
      });
    return loading;
  },
  connect: async (providerId) => {
    await connectIntegration(providerId);
    await get().load();
  },
  disconnect: async (providerId) => {
    await disconnectIntegration(providerId);
    await get().load();
  },
  reset: async () => {
    await resetAccounts();
    await get().load();
  },
}));

subscribeAccounts(() => {
  if (useIntegrationStore.getState().loaded) {
    void useIntegrationStore.getState().load();
  }
});
