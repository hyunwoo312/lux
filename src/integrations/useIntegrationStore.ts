import { create } from "zustand";
import {
  connectIntegration,
  disconnectIntegration,
} from "@/integrations/integration-client";
import { readAccountSummaries } from "@/integrations/token-store";
import type { IntegrationAccountSummary, IntegrationProviderId } from "@/integrations/types";

type IntegrationStoreState = {
  accounts: IntegrationAccountSummary[];
  loaded: boolean;
  load: () => Promise<void>;
  connect: (providerId: IntegrationProviderId) => Promise<void>;
  disconnect: (providerId: IntegrationProviderId) => Promise<void>;
};

export const useIntegrationStore = create<IntegrationStoreState>()((set, get) => ({
  accounts: [],
  loaded: false,
  load: async () => {
    const accounts = await readAccountSummaries();
    set({ accounts, loaded: true });
  },
  connect: async (providerId) => {
    await connectIntegration(providerId);
    await get().load();
  },
  disconnect: async (providerId) => {
    await disconnectIntegration(providerId);
    await get().load();
  },
}));
