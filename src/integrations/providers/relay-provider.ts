import { z } from "zod";
import {
  IntegrationReconnectRequiredError,
  isReconnectRequiredStatus,
} from "@/integrations/errors";
import { ensureOk, fetchTokenEndpoint, TemporaryAuthError, parseResponse } from "@/lib/net";
import { buildPkceAuthorizeUrl, parseScopes } from "@/integrations/providers/pkce";
import { RELAY_BASE_URL } from "@/lib/relay";
import type {
  CodeAuthProvider,
  IntegrationProfile,
  IntegrationProviderId,
  IntegrationTokenResponse,
} from "@/integrations/types";

const relayTokenSchema = z.object({
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
  token_type: z.string().optional(),
  scope: z.string().optional(),
  error: z.string().optional(),
});

type RelayTokenPayload = z.infer<typeof relayTokenSchema>;

type RelayProviderConfig = {
  id: IntegrationProviderId;
  label: string;
  scopes: string[];
  clientIdEnvKey?: string;
  loadClientId?: () => Promise<string | undefined>;
  authorizationEndpoint: string;
  authParams?: Record<string, string>;
  supportsRefresh: boolean;
  defaultExpiresIn: number;
  fetchProfile: (accessToken: string) => Promise<IntegrationProfile>;
};

export function createRelayProvider(config: RelayProviderConfig): CodeAuthProvider {
  const relayEndpoint = `${RELAY_BASE_URL}/${config.id}/token`;

  const toTokenResponse = (
    payload: RelayTokenPayload,
    accessToken: string,
  ): IntegrationTokenResponse => ({
    accessToken,
    refreshToken: payload.refresh_token,
    expiresIn: payload.expires_in ?? config.defaultExpiresIn,
    tokenType: payload.token_type ?? "Bearer",
    scopes: parseScopes(payload.scope, config.scopes),
  });

  const postToRelay = (body: Record<string, string>): Promise<Response> =>
    fetchTokenEndpoint(config.label, relayEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const refreshToken: CodeAuthProvider["refreshToken"] = async ({ refreshToken: current }) => {
    const response = await postToRelay({
      grant_type: "refresh_token",
      refresh_token: current,
    });

    if (!response.ok) {
      if (isReconnectRequiredStatus(response.status)) {
        throw new IntegrationReconnectRequiredError(`${config.label} needs to be reconnected`);
      }
      throw new TemporaryAuthError(`${config.label} is temporarily unavailable`);
    }

    const payload = parseResponse("token", relayTokenSchema, await response.json());
    if (payload.error) {
      throw new IntegrationReconnectRequiredError(`${config.label} needs to be reconnected`);
    }
    if (!payload.access_token) {
      throw new TemporaryAuthError(`${config.label} is temporarily unavailable`);
    }
    return {
      ...toTokenResponse(payload, payload.access_token),
      refreshToken: payload.refresh_token ?? current,
    };
  };

  return {
    id: config.id,
    label: config.label,
    scopes: config.scopes,
    clientIdEnvKey: config.clientIdEnvKey,
    loadClientId: config.loadClientId,
    auth: "code",
    buildPkceAuthUrl: (params) =>
      buildPkceAuthorizeUrl(
        { authorizationEndpoint: config.authorizationEndpoint, authParams: config.authParams },
        params,
      ),
    exchangeCode: async ({ code, redirectUri, codeVerifier }) => {
      const response = await postToRelay({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      });

      ensureOk(response, `${config.label} sign-in could not be completed`);

      const payload = parseResponse("token", relayTokenSchema, await response.json());
      if (payload.error || !payload.access_token) {
        throw new Error(`${config.label} sign-in could not be completed`);
      }

      return toTokenResponse(payload, payload.access_token);
    },
    ...(config.supportsRefresh ? { refreshToken } : {}),
    fetchProfile: config.fetchProfile,
  };
}
