import { z } from "zod";
import {
  IntegrationReconnectRequiredError,
  isReconnectRequiredStatus,
} from "@/integrations/errors";
import { ensureOk, fetchTokenEndpoint, readJson, TemporaryAuthError } from "@/lib/net";
import { buildPkceAuthorizeUrl, parseScopes } from "@/integrations/providers/pkce";
import type {
  CodeAuthProvider,
  IntegrationProfile,
  IntegrationProviderId,
  IntegrationTokenResponse,
} from "@/integrations/types";

const tokenPayloadSchema = z.object({
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
  token_type: z.string().optional(),
  scope: z.string().optional(),
  error: z.string().optional(),
});

type TokenPayload = z.infer<typeof tokenPayloadSchema>;

type TokenGrant =
  | {
      grant: "authorization_code";
      clientId: string;
      code: string;
      redirectUri: string;
      codeVerifier: string;
    }
  | { grant: "refresh_token"; clientId: string; refreshToken: string };

export type CodeProviderConfig = {
  id: IntegrationProviderId;
  label: string;
  scopes: string[];
  clientId?: string;
  loadClientId?: () => Promise<string | undefined>;
  authorizationEndpoint: string;
  authParams?: Record<string, string>;
  supportsRefresh: boolean;
  defaultExpiresIn: number;
  tokenRequest: (grant: TokenGrant) => { url: string; init: RequestInit };
  fetchProfile: (accessToken: string) => Promise<IntegrationProfile>;
};

export function createCodeProvider(config: CodeProviderConfig): CodeAuthProvider {
  const request = (grant: TokenGrant): Promise<Response> => {
    const { url, init } = config.tokenRequest(grant);
    return fetchTokenEndpoint(config.label, url, init);
  };

  const toTokenResponse = (
    payload: TokenPayload,
    accessToken: string,
  ): IntegrationTokenResponse => ({
    accessToken,
    refreshToken: payload.refresh_token,
    expiresIn: payload.expires_in ?? config.defaultExpiresIn,
    tokenType: payload.token_type ?? "Bearer",
    scopes: parseScopes(payload.scope, config.scopes),
  });

  const refreshToken: CodeAuthProvider["refreshToken"] = async ({
    clientId,
    refreshToken: current,
  }) => {
    const response = await request({ grant: "refresh_token", clientId, refreshToken: current });

    if (!response.ok) {
      if (isReconnectRequiredStatus(response.status)) {
        throw new IntegrationReconnectRequiredError(`${config.label} needs to be reconnected`);
      }
      throw new TemporaryAuthError(`${config.label} is temporarily unavailable`);
    }

    const payload = await readJson(response, "token", tokenPayloadSchema);
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
    clientId: config.clientId,
    loadClientId: config.loadClientId,
    auth: "code",
    buildPkceAuthUrl: (params) =>
      buildPkceAuthorizeUrl(
        { authorizationEndpoint: config.authorizationEndpoint, authParams: config.authParams },
        params,
      ),
    exchangeCode: async ({ clientId, code, redirectUri, codeVerifier }) => {
      const response = await request({
        grant: "authorization_code",
        clientId,
        code,
        redirectUri,
        codeVerifier,
      });

      ensureOk(response, `${config.label} sign-in could not be completed`);

      const payload = await readJson(response, "token", tokenPayloadSchema);
      if (payload.error || !payload.access_token) {
        throw new Error(`${config.label} sign-in could not be completed`);
      }

      return toTokenResponse(payload, payload.access_token);
    },
    ...(config.supportsRefresh ? { refreshToken } : {}),
    fetchProfile: config.fetchProfile,
  };
}
