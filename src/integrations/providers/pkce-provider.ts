import { z } from "zod";
import {
  IntegrationReconnectRequiredError,
  isReconnectRequiredStatus,
} from "@/integrations/errors";
import { ensureOk, fetchTokenEndpoint, TemporaryAuthError, parseResponse } from "@/lib/net";
import { buildPkceAuthorizeUrl, parseScopes } from "@/integrations/providers/pkce";
import type {
  IntegrationProfile,
  IntegrationProvider,
  IntegrationProviderId,
  IntegrationTokenResponse,
} from "@/integrations/types";

const tokenPayloadSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
  token_type: z.string(),
  scope: z.string().optional(),
});

type PkceTokenPayload = z.infer<typeof tokenPayloadSchema>;

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
    buildPkceAuthUrl: (params) =>
      buildPkceAuthorizeUrl(
        { authorizationEndpoint: config.authorizationEndpoint, authParams: config.authParams },
        params,
      ),
    exchangeCode: async ({ clientId, code, redirectUri, codeVerifier }) => {
      const response = await fetchTokenEndpoint(config.label, config.tokenEndpoint, {
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

      ensureOk(response, `${config.label} token exchange failed`);

      return toTokenResponse(parseResponse("token", tokenPayloadSchema, await response.json()));
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

      const response = await fetchTokenEndpoint(config.label, config.tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!response.ok) {
        if (isReconnectRequiredStatus(response.status)) {
          throw new IntegrationReconnectRequiredError(`${config.label} needs to be reconnected`);
        }
        throw new TemporaryAuthError(`${config.label} is temporarily unavailable`);
      }

      const payload = parseResponse("token", tokenPayloadSchema, await response.json());
      return { ...toTokenResponse(payload), refreshToken: payload.refresh_token ?? refreshToken };
    },
    fetchProfile: config.fetchProfile,
  };
}
