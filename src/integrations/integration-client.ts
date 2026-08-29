import {
  createCodeChallenge,
  createCodeVerifier,
  createOAuthState,
  getRedirectUri,
  launchWebAuthFlow,
  parseAuthCodeCallback,
} from "@/integrations/oauth";
import { IntegrationReconnectRequiredError } from "@/integrations/errors";
import {
  InvalidResponseError,
  RateLimitError,
  rateLimitError,
  TemporaryAuthError,
  withTimeout,
} from "@/lib/net";
import { anilistProvider } from "@/integrations/providers/anilist";
import { githubProvider } from "@/integrations/providers/github";
import { googleProvider } from "@/integrations/providers/google";
import { microsoftProvider } from "@/integrations/providers/microsoft";
import { spotifyProvider } from "@/integrations/providers/spotify";
import {
  deleteAccount,
  getAccountByProvider,
  replaceProviderAccount,
  writeAccount,
} from "@/integrations/token-store";
import type {
  IntegrationAccount,
  IntegrationProvider,
  IntegrationProviderId,
  IntegrationTokenResponse,
} from "@/integrations/types";

const TOKEN_REFRESH_BUFFER_MS = 300_000;

const rateLimitedUntil = new Map<IntegrationProviderId, number>();

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

  const clientId = provider.clientId?.trim();

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
  staleToken?: string,
): Promise<IntegrationTokenResponse> {
  const clientId = await resolveClientId(provider);
  const state = createOAuthState();

  if (provider.auth === "browser") {
    return provider.acquireToken({ clientId, state, interactive, staleToken });
  }

  const redirectUri = getRedirectUriForProvider(provider.id);
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
    lastAuthorizedAt: now,
    token: {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: getExpiresAt(token.expiresIn),
      tokenType: token.tokenType,
      scopes: token.scopes,
    },
  };

  await replaceProviderAccount(account);
  return account;
}

export async function disconnectIntegration(providerId: IntegrationProviderId): Promise<void> {
  const account = await getAccountByProvider(providerId);

  if (account) {
    await deleteAccount(account.id);
  }
}

async function markNeedsReconnect(account: IntegrationAccount, message: string): Promise<void> {
  await writeAccount({
    ...account,
    status: "needsReconnect",
    lastError: message,
  });
}

function tokenNeedsRefresh(
  token: NonNullable<IntegrationAccount["token"]>,
  staleToken: string | undefined,
): boolean {
  if (staleToken !== undefined) return token.accessToken === staleToken;
  return token.expiresAt - Date.now() <= TOKEN_REFRESH_BUFFER_MS;
}

function withRefreshLock<T>(providerId: IntegrationProviderId, task: () => Promise<T>): Promise<T> {
  return navigator.locks.request(`lux:token-refresh:${providerId}`, task);
}

async function getProviderAccessToken(
  providerId: IntegrationProviderId,
  staleToken?: string,
): Promise<string> {
  const provider = getProvider(providerId);
  const account = await getAccountByProvider(providerId);

  if (!account?.token || account.status !== "connected") {
    throw new Error(`${provider.label} is not connected`);
  }

  if (!tokenNeedsRefresh(account.token, staleToken)) {
    return account.token.accessToken;
  }

  return withRefreshLock(providerId, async () => {
    const current = await getAccountByProvider(providerId);
    if (!current?.token || current.status !== "connected") {
      throw new Error(`${provider.label} is not connected`);
    }
    if (!tokenNeedsRefresh(current.token, staleToken)) {
      return current.token.accessToken;
    }
    return refreshProviderToken(provider, current);
  });
}

async function refreshProviderToken(
  provider: IntegrationProvider,
  account: IntegrationAccount,
): Promise<string> {
  const refresh = provider.auth === "code" ? provider.refreshToken : undefined;
  const refreshToken = account.token?.refreshToken;
  const params =
    refresh && refreshToken
      ? { clientId: await resolveClientId(provider), refreshToken }
      : undefined;

  let token: IntegrationTokenResponse;
  try {
    token =
      refresh && params
        ? await refresh(params)
        : await requestToken(provider, false, account.token?.accessToken);
  } catch (error) {
    if (error instanceof TemporaryAuthError || error instanceof InvalidResponseError) {
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

  await writeAccount({
    ...account,
    status: "connected",
    lastError: undefined,
    lastAuthorizedAt: new Date().toISOString(),
    token: {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken ?? account.token?.refreshToken,
      expiresAt: getExpiresAt(token.expiresIn),
      tokenType: token.tokenType,
      scopes: token.scopes,
    },
  });

  return token.accessToken;
}

async function markProviderNeedsReconnect(providerId: IntegrationProviderId): Promise<void> {
  const account = await getAccountByProvider(providerId);
  if (account && account.status === "connected") {
    await markNeedsReconnect(account, `${getProvider(providerId).label} needs to be reconnected`);
  }
}

function assertNotRateLimited(providerId: IntegrationProviderId): void {
  const until = rateLimitedUntil.get(providerId);
  if (until === undefined) return;
  const waitMs = until - Date.now();
  if (waitMs <= 0) {
    rateLimitedUntil.delete(providerId);
    return;
  }
  throw new RateLimitError(waitMs);
}

function recordRateLimit(providerId: IntegrationProviderId, response: Response): Response {
  const limited = rateLimitError(response);
  if (limited) rateLimitedUntil.set(providerId, Date.now() + limited.retryAfterMs);
  else rateLimitedUntil.delete(providerId);
  return response;
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
  assertNotRateLimited(providerId);

  const accessToken = await getProviderAccessToken(providerId);
  const response = recordRateLimit(providerId, await fetch(input, authorize(init, accessToken)));

  if (response.status !== 401) {
    return response;
  }

  const refreshedToken = await getProviderAccessToken(providerId, accessToken);
  const retried = recordRateLimit(providerId, await fetch(input, authorize(init, refreshedToken)));

  if (retried.status === 401) {
    await markProviderNeedsReconnect(providerId);
  }

  return retried;
}
