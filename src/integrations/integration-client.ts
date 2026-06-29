import {
  createCodeChallenge,
  createCodeVerifier,
  createOAuthState,
  getRedirectUri,
  launchWebAuthFlow,
  parseAuthCodeCallback,
} from "@/integrations/oauth";
import {
  IntegrationReconnectRequiredError,
  IntegrationTemporaryAuthError,
} from "@/integrations/errors";
import { anilistProvider } from "@/integrations/providers/anilist";
import { githubProvider } from "@/integrations/providers/github";
import { googleProvider } from "@/integrations/providers/google";
import { microsoftProvider } from "@/integrations/providers/microsoft";
import { spotifyProvider } from "@/integrations/providers/spotify";
import { deleteAccount, getAccountByProvider, writeAccount } from "@/integrations/token-store";
import type {
  IntegrationAccount,
  IntegrationProvider,
  IntegrationProviderId,
  IntegrationTokenResponse,
} from "@/integrations/types";

const TOKEN_REFRESH_BUFFER_MS = 300_000;
const REQUEST_TIMEOUT_MS = 10_000;

const providers: Record<IntegrationProviderId, IntegrationProvider> = {
  google: googleProvider,
  microsoft: microsoftProvider,
  spotify: spotifyProvider,
  github: githubProvider,
  anilist: anilistProvider,
};

function getProvider(providerId: IntegrationProviderId): IntegrationProvider {
  return providers[providerId];
}

async function resolveClientId(provider: IntegrationProvider): Promise<string> {
  if (provider.loadClientId) {
    const clientId = (await provider.loadClientId())?.trim();
    if (!clientId) {
      throw new Error(`Add your ${provider.label} client ID in Settings → Accounts`);
    }
    return clientId;
  }

  const env = import.meta.env as Record<string, string | undefined>;
  const clientId = provider.clientIdEnvKey ? env[provider.clientIdEnvKey]?.trim() : undefined;

  if (!clientId) {
    throw new Error(`Add a ${provider.label} client ID to connect`);
  }

  return clientId;
}

function getExpiresAt(expiresInSeconds: number): number {
  return Date.now() + expiresInSeconds * 1000;
}

function getRedirectUriForProvider(providerId: IntegrationProviderId): string {
  return getRedirectUri(`${providerId}/oauth`);
}

export function getIntegrationRedirectUri(providerId: IntegrationProviderId): string | null {
  if (typeof chrome === "undefined" || !chrome.identity?.getRedirectURL) {
    return null;
  }
  return getRedirectUriForProvider(providerId);
}

async function requestToken(
  provider: IntegrationProvider,
  interactive: boolean,
): Promise<IntegrationTokenResponse> {
  const clientId = await resolveClientId(provider);
  const state = createOAuthState();

  if (provider.acquireToken) {
    return provider.acquireToken({ clientId, state, interactive });
  }

  const redirectUri = getRedirectUriForProvider(provider.id);

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

  throw new Error(`${provider.label} is not configured for sign-in`);
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

const refreshingTokens = new Map<IntegrationProviderId, Promise<string>>();

async function getProviderAccessToken(
  providerId: IntegrationProviderId,
  forceRefresh = false,
): Promise<string> {
  const provider = getProvider(providerId);
  const account = await getAccountByProvider(providerId);

  if (!account?.token || account.status !== "connected") {
    throw new Error(`${provider.label} is not connected`);
  }

  if (!forceRefresh && account.token.expiresAt - Date.now() > TOKEN_REFRESH_BUFFER_MS) {
    return account.token.accessToken;
  }

  const inFlight = refreshingTokens.get(providerId);
  if (inFlight) return inFlight;

  const refresh = refreshProviderToken(provider, account).finally(() => {
    refreshingTokens.delete(providerId);
  });
  refreshingTokens.set(providerId, refresh);
  return refresh;
}

async function refreshProviderToken(
  provider: IntegrationProvider,
  account: IntegrationAccount,
): Promise<string> {
  try {
    const token =
      provider.refreshToken && account.token?.refreshToken
        ? await provider.refreshToken({
            clientId: await resolveClientId(provider),
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
        refreshToken: token.refreshToken ?? account.token?.refreshToken,
        expiresAt: getExpiresAt(token.expiresIn),
        tokenType: token.tokenType,
        scopes: token.scopes,
      },
    });

    return token.accessToken;
  } catch (error) {
    if (error instanceof IntegrationTemporaryAuthError) {
      await writeAccount({ ...account, status: "connected", lastError: error.message });
      throw error;
    }
    if (error instanceof IntegrationReconnectRequiredError) {
      await markNeedsReconnect(account, error.message);
      throw error;
    }
    const message = `${provider.label} needs to be reconnected`;
    await markNeedsReconnect(account, message);
    throw new Error(message, { cause: error });
  }
}

async function markProviderNeedsReconnect(providerId: IntegrationProviderId): Promise<void> {
  const account = await getAccountByProvider(providerId);
  if (account && account.status === "connected") {
    await markNeedsReconnect(account, `${getProvider(providerId).label} needs to be reconnected`);
  }
}

function withTimeout(signal?: AbortSignal | null): AbortSignal {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function authorize(init: RequestInit, accessToken: string): RequestInit {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return { ...init, headers, signal: withTimeout(init.signal) };
}

export async function integrationFetch(
  providerId: IntegrationProviderId,
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const accessToken = await getProviderAccessToken(providerId);
  const response = await fetch(input, authorize(init, accessToken));

  if (response.status !== 401) {
    return response;
  }

  const refreshedToken = await getProviderAccessToken(providerId, true);
  const retried = await fetch(input, authorize(init, refreshedToken));

  if (retried.status === 401) {
    await markProviderNeedsReconnect(providerId);
  }

  return retried;
}
