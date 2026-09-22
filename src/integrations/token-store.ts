import { readResult, watchStorage, writeOrThrow } from "@/lib/storage";
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

let cached: Promise<IntegrationStorageState> | null = null;

type AccountSummaries = { accounts: IntegrationAccountSummary[]; unreadable: boolean };

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

async function readUncached(): Promise<IntegrationStorageState> {
  const result = await readResult(STORAGE_KEY, integrationStorageSchema);
  if (result.status === "unreadable") cached = null;
  return result.status === "read" ? result.value : EMPTY_STORAGE;
}

function readStorage(): Promise<IntegrationStorageState> {
  cached ??= readUncached();
  return cached;
}

async function readStorageForWrite(): Promise<IntegrationStorageState> {
  const result = await readResult(STORAGE_KEY, integrationStorageSchema);
  if (result.status === "unreadable") {
    throw new Error("Connected accounts could not be read, so nothing was changed.");
  }
  return result.status === "read" ? result.value : EMPTY_STORAGE;
}

async function writeStorage(state: IntegrationStorageState): Promise<void> {
  cached = null;
  await writeOrThrow(STORAGE_KEY, integrationStorageSchema.parse(state));
}

export async function readAccountSummaries(): Promise<AccountSummaries> {
  const result = await readResult(STORAGE_KEY, integrationStorageSchema);
  if (result.status === "unreadable") return { accounts: [], unreadable: true };
  const state = result.status === "read" ? result.value : EMPTY_STORAGE;
  cached = Promise.resolve(state);
  return { accounts: Object.values(state.accounts).map(toSummary), unreadable: false };
}

export async function getAccountByProvider(
  providerId: IntegrationProviderId,
  fresh = false,
): Promise<IntegrationAccount | null> {
  if (fresh) cached = null;
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

export async function resetAccounts(): Promise<void> {
  await withAccountsLock(() => writeStorage(EMPTY_STORAGE));
}

watchStorage(STORAGE_KEY, () => {
  cached = null;
  for (const listener of listeners) listener();
});
