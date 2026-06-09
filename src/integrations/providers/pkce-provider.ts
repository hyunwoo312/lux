import {
  IntegrationReconnectRequiredError,
  IntegrationTemporaryAuthError,
  isReconnectRequiredStatus,
} from "@/integrations/errors";
import type {
  IntegrationProfile,
  IntegrationProvider,
  IntegrationProviderId,
  IntegrationTokenResponse,
} from "@/integrations/types";

type PkceTokenPayload = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
};

type PkceProviderConfig = {
  id: IntegrationProviderId;
  label: string;
  scopes: string[];
  authorizationEndpoint: string;
  tokenEndpoint: string;
  clientIdEnvKey?: string;
  loadClientId?: () => Promise<string | undefined>;
  authParams?: Record<string, string>;
  includeScopeOnRefresh?: boolean;
  fetchProfile: (accessToken: string) => Promise<IntegrationProfile>;
};

function parseScopes(scope: string | undefined, fallback: string[]): string[] {
  return scope?.trim() ? scope.split(" ") : fallback;
}

export function createPkceProvider(config: PkceProviderConfig): IntegrationProvider {
  const toTokenResponse = (payload: PkceTokenPayload): IntegrationTokenResponse => ({
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresIn: payload.expires_in,
    tokenType: payload.token_type,
    scopes: parseScopes(payload.scope, config.scopes),
  });

  return {
    id: config.id,
    label: config.label,
    scopes: config.scopes,
    clientIdEnvKey: config.clientIdEnvKey,
    loadClientId: config.loadClientId,
    buildPkceAuthUrl: ({ clientId, redirectUri, state, codeChallenge, scopes }) => {
      const url = new URL(config.authorizationEndpoint);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("scope", scopes.join(" "));
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", codeChallenge);
      url.searchParams.set("code_challenge_method", "S256");
      for (const [key, value] of Object.entries(config.authParams ?? {})) {
        url.searchParams.set(key, value);
      }
      return url.toString();
    },
    exchangeCode: async ({ clientId, code, redirectUri, codeVerifier }) => {
      const response = await fetch(config.tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
        }),
      });

      if (!response.ok) {
        throw new Error(`${config.label} token exchange failed`);
      }

      return toTokenResponse((await response.json()) as PkceTokenPayload);
    },
    refreshToken: async ({ clientId, refreshToken }) => {
      const body = new URLSearchParams({
        client_id: clientId,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });
      if (config.includeScopeOnRefresh) {
        body.set("scope", config.scopes.join(" "));
      }

      const response = await fetch(config.tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!response.ok) {
        if (isReconnectRequiredStatus(response.status)) {
          throw new IntegrationReconnectRequiredError(`${config.label} needs to be reconnected`);
        }
        throw new IntegrationTemporaryAuthError(`${config.label} is temporarily unavailable`);
      }

      const payload = (await response.json()) as PkceTokenPayload;
      return { ...toTokenResponse(payload), refreshToken: payload.refresh_token ?? refreshToken };
    },
    fetchProfile: config.fetchProfile,
  };
}
