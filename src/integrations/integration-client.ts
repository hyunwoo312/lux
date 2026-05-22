import {
  createCodeChallenge,
  createCodeVerifier,
  createOAuthState,
  getRedirectUri,
  launchWebAuthFlow,
  parseAuthCodeCallback,
  parseImplicitTokenCallback,
} from "@/integrations/oauth";
import { googleProvider } from "@/integrations/providers/google";
import { microsoftProvider } from "@/integrations/providers/microsoft";
import { deleteAccount, getAccountByProvider, writeAccount } from "@/integrations/token-store";
import type {
  IntegrationAccount,
  IntegrationProvider,
  IntegrationProviderId,
  IntegrationTokenResponse,
} from "@/integrations/types";

const TOKEN_REFRESH_BUFFER_MS = 300_000;

const providers: Record<IntegrationProviderId, IntegrationProvider> = {
  google: googleProvider,
  microsoft: microsoftProvider,
};

function getProvider(providerId: IntegrationProviderId): IntegrationProvider {
  return providers[providerId];
}

function getClientId(provider: IntegrationProvider): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const clientId = env[provider.clientIdEnvKey];

  if (!clientId?.trim()) {
    throw new Error(`Add a ${provider.label} client ID to connect`);
  }

  return clientId.trim();
}

function getExpiresAt(expiresInSeconds: number): number {
  return Date.now() + expiresInSeconds * 1000;
}

function getRedirectUriForProvider(providerId: IntegrationProviderId): string {
  return getRedirectUri(`${providerId}/oauth`);
}

async function requestToken(
  provider: IntegrationProvider,
  interactive: boolean,
): Promise<IntegrationTokenResponse> {
  const clientId = getClientId(provider);
  const redirectUri = getRedirectUriForProvider(provider.id);
  const state = createOAuthState();

  if (provider.buildPkceAuthUrl && provider.exchangeCode) {
    const codeVerifier = createCodeVerifier();
    const codeChallenge = await createCodeChallenge(codeVerifier);
    const authUrl = provider.buildPkceAuthUrl({
      clientId,
      redirectUri,
      state,
      codeChallenge,
      scopes: provider.scopes,
    });
    const callbackUrl = await launchWebAuthFlow(authUrl, interactive);
    const callback = parseAuthCodeCallback(callbackUrl);

    if (callback.state !== state) {
      throw new Error("OAuth callback state did not match the active request");
    }

    return provider.exchangeCode({ clientId, code: callback.code, redirectUri, codeVerifier });
  }

  if (!provider.buildAuthUrl) {
    throw new Error(`${provider.label} is not configured for sign-in`);
  }

  const authUrl = provider.buildAuthUrl({ clientId, redirectUri, state, scopes: provider.scopes });
  const callbackUrl = await launchWebAuthFlow(authUrl, interactive);
  const token = parseImplicitTokenCallback(callbackUrl);

  if (token.state !== state) {
    throw new Error("OAuth callback state did not match the active request");
  }

  return {
    accessToken: token.accessToken,
    expiresIn: token.expiresIn,
    scopes: provider.scopes,
    tokenType: token.tokenType,
  };
}

export async function connectIntegration(
  providerId: IntegrationProviderId,
): Promise<IntegrationAccount> {
  const provider = getProvider(providerId);
  const token = await requestToken(provider, true);
  const profile = await provider.fetchProfile(token.accessToken);
  const now = new Date().toISOString();
  const account: IntegrationAccount = {
    id: `${provider.id}-${profile.providerAccountId}`,
    providerId: provider.id,
    providerAccountId: profile.providerAccountId,
    displayName: profile.displayName,
    email: profile.email,
    avatarUrl: profile.avatarUrl,
    status: "connected",
    connectedAt: now,
    lastSyncedAt: now,
    token: {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: getExpiresAt(token.expiresIn),
      tokenType: token.tokenType,
      scopes: token.scopes,
    },
  };

  await writeAccount(account);
  return account;
}

export async function disconnectIntegration(providerId: IntegrationProviderId): Promise<void> {
  const account = await getAccountByProvider(providerId);

  if (account) {
    await deleteAccount(account.id);
  }
}

async function markNeedsReconnect(account: IntegrationAccount, message: string): Promise<void> {
  await writeAccount({ ...account, status: "needsReconnect", lastError: message, token: undefined });
}

async function getProviderAccessToken(providerId: IntegrationProviderId): Promise<string> {
  const provider = getProvider(providerId);
  const account = await getAccountByProvider(providerId);

  if (!account?.token || account.status !== "connected") {
    throw new Error(`${provider.label} is not connected`);
  }

  if (account.token.expiresAt - Date.now() > TOKEN_REFRESH_BUFFER_MS) {
    return account.token.accessToken;
  }

  try {
    const token =
      provider.refreshToken && account.token.refreshToken
        ? await provider.refreshToken({
            clientId: getClientId(provider),
            refreshToken: account.token.refreshToken,
          })
        : await requestToken(provider, false);
    await writeAccount({
      ...account,
      status: "connected",
      lastError: undefined,
      lastSyncedAt: new Date().toISOString(),
      token: {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken ?? account.token.refreshToken,
        expiresAt: getExpiresAt(token.expiresIn),
        tokenType: token.tokenType,
        scopes: token.scopes,
      },
    });

    return token.accessToken;
  } catch {
    const message = `${provider.label} needs to be reconnected`;
    await markNeedsReconnect(account, message);
    throw new Error(message);
  }
}

export async function integrationFetch(
  providerId: IntegrationProviderId,
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const accessToken = await getProviderAccessToken(providerId);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(input, { ...init, headers });
}
