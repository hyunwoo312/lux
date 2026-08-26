import { read, readResult, watchStorage, writeOrThrow } from "@/lib/storage";
import {
  integrationAccountSchema,
  integrationStorageSchema,
  type IntegrationAccount,
  type IntegrationAccountSummary,
  type IntegrationProviderId,
  type IntegrationStorageState,
} from "@/integrations/types";

const STORAGE_KEY = "integrations";
const ACCOUNTS_LOCK = "lux-integration-accounts";

const EMPTY_STORAGE: IntegrationStorageState = { accounts: {} };

const listeners = new Set<() => void>();

function withAccountsLock<T>(task: () => Promise<T>): Promise<T> {
  return navigator.locks.request(ACCOUNTS_LOCK, task);
}

export function subscribeAccounts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function toSummary(account: IntegrationAccount): IntegrationAccountSummary {
  const summary = { ...account };
  delete summary.token;
  return summary;
}

async function readStorage(): Promise<IntegrationStorageState> {
  return read(STORAGE_KEY, integrationStorageSchema, EMPTY_STORAGE);
}

async function readStorageForWrite(): Promise<IntegrationStorageState> {
  const result = await readResult(STORAGE_KEY, integrationStorageSchema);
  if (result.status === "unreadable") {
    throw new Error("Connected accounts could not be read, so nothing was changed.");
  }
  return result.status === "read" ? result.value : EMPTY_STORAGE;
}

async function writeStorage(state: IntegrationStorageState): Promise<void> {
  await writeOrThrow(STORAGE_KEY, integrationStorageSchema.parse(state));
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
  await withAccountsLock(async () => {
    const state = await readStorageForWrite();
    await writeStorage({
      ...state,
      accounts: { ...state.accounts, [parsed.id]: parsed },
    });
  });
}

export async function replaceProviderAccount(account: IntegrationAccount): Promise<void> {
  const parsed = integrationAccountSchema.parse(account);
  await withAccountsLock(async () => {
    const state = await readStorageForWrite();
    const accounts: Record<string, IntegrationAccount> = {};
    for (const [id, existing] of Object.entries(state.accounts)) {
      if (existing.providerId !== parsed.providerId) accounts[id] = existing;
    }
    accounts[parsed.id] = parsed;
    await writeStorage({ ...state, accounts });
  });
}

export async function deleteAccount(accountId: string): Promise<void> {
  await withAccountsLock(async () => {
    const state = await readStorageForWrite();
    const accounts = { ...state.accounts };
    delete accounts[accountId];
    await writeStorage({ ...state, accounts });
  });
}

watchStorage(STORAGE_KEY, () => {
  for (const listener of listeners) listener();
});
