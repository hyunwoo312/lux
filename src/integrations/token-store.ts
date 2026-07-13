import { read, watchStorage, writeOrThrow } from "@/lib/storage";
import {
  integrationAccountSchema,
  integrationStorageSchema,
  type IntegrationAccount,
  type IntegrationAccountSummary,
  type IntegrationProviderId,
  type IntegrationStorageState,
} from "@/integrations/types";

const STORAGE_KEY = "integrations";

const EMPTY_STORAGE: IntegrationStorageState = { version: 1, accounts: {} };

const listeners = new Set<() => void>();

export function subscribeAccounts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function toSummary(account: IntegrationAccount): IntegrationAccountSummary {
  return {
    id: account.id,
    providerId: account.providerId,
    providerAccountId: account.providerAccountId,
    displayName: account.displayName,
    email: account.email,
    avatarUrl: account.avatarUrl,
    status: account.status,
    connectedAt: account.connectedAt,
    lastSyncedAt: account.lastSyncedAt,
    lastError: account.lastError,
  };
}

async function readStorage(): Promise<IntegrationStorageState> {
  return read(STORAGE_KEY, integrationStorageSchema, EMPTY_STORAGE);
}

async function writeStorage(state: IntegrationStorageState): Promise<void> {
  await writeOrThrow(STORAGE_KEY, integrationStorageSchema.parse(state));
  for (const listener of listeners) listener();
}

export async function readAccountSummaries(): Promise<IntegrationAccountSummary[]> {
  const state = await readStorage();
  return Object.values(state.accounts).map(toSummary);
}

export async function getAccountByProvider(
  providerId: IntegrationProviderId,
): Promise<IntegrationAccount | null> {
  const state = await readStorage();
  return Object.values(state.accounts).find((account) => account.providerId === providerId) ?? null;
}

export async function writeAccount(account: IntegrationAccount): Promise<void> {
  const parsed = integrationAccountSchema.parse(account);
  const state = await readStorage();
  await writeStorage({
    ...state,
    accounts: { ...state.accounts, [parsed.id]: parsed },
  });
}

export async function replaceProviderAccount(account: IntegrationAccount): Promise<void> {
  const parsed = integrationAccountSchema.parse(account);
  const state = await readStorage();
  const accounts: Record<string, IntegrationAccount> = {};
  for (const [id, existing] of Object.entries(state.accounts)) {
    if (existing.providerId !== parsed.providerId) accounts[id] = existing;
  }
  accounts[parsed.id] = parsed;
  await writeStorage({ ...state, accounts });
}

export async function deleteAccount(accountId: string): Promise<void> {
  const state = await readStorage();
  const accounts = { ...state.accounts };
  delete accounts[accountId];
  await writeStorage({ ...state, accounts });
}

watchStorage(STORAGE_KEY, () => {
  for (const listener of listeners) listener();
});
