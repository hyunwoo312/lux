import {
  accountFor,
  useIntegrationStore,
  type IntegrationAccountSummary,
  type IntegrationProviderId,
} from "@/integrations";

type AccountResource = { cacheKey: string; account?: IntegrationProviderId };

export function accountResourceKey(
  definition: AccountResource,
  accounts: readonly IntegrationAccountSummary[] = useIntegrationStore.getState().accounts,
): string {
  if (!definition.account) return definition.cacheKey;
  return `${definition.cacheKey}:account:${accountFor(accounts, definition.account)?.id ?? "signed-out"}`;
}

export function useAccountResourceKeys(definitions: readonly AccountResource[]): string[] {
  const keys = useIntegrationStore((state) =>
    definitions.map((definition) => accountResourceKey(definition, state.accounts)).join("\u0000"),
  );
  return definitions.length === 0 ? [] : keys.split("\u0000");
}

export async function fetchForAccount<T>(
  definition: AccountResource & { fetch: (signal: AbortSignal) => Promise<T> },
  key: string,
  signal: AbortSignal,
): Promise<T> {
  if (definition.account && accountResourceKey(definition) !== key)
    throw new DOMException("Account changed during request", "AbortError");
  const load = definition.fetch;
  const data = await load(signal);
  if (definition.account && accountResourceKey(definition) !== key)
    throw new DOMException("Account changed during request", "AbortError");
  return data;
}
