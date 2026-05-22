import type { IntegrationProvider, IntegrationTokenResponse } from "@/integrations/types";

const AUTHORIZATION_ENDPOINT = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const TOKEN_ENDPOINT = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const PROFILE_ENDPOINT = "https://graph.microsoft.com/v1.0/me";

const SCOPES = ["offline_access", "User.Read", "Calendars.Read"];

type MicrosoftProfile = {
  id: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
};

type MicrosoftTokenPayload = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
};

function parseScopes(scope: string | undefined, fallback: string[]): string[] {
  return scope?.trim() ? scope.split(" ") : fallback;
}

function toEmail(value: string | undefined): string | undefined {
  return value && value.includes("@") ? value : undefined;
}

function toTokenResponse(payload: MicrosoftTokenPayload): IntegrationTokenResponse {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresIn: payload.expires_in,
    tokenType: payload.token_type,
    scopes: parseScopes(payload.scope, SCOPES),
  };
}

export const microsoftProvider: IntegrationProvider = {
  id: "microsoft",
  label: "Outlook Calendar",
  scopes: SCOPES,
  clientIdEnvKey: "VITE_MICROSOFT_CLIENT_ID",
  buildPkceAuthUrl: ({ clientId, redirectUri, state, codeChallenge, scopes }) => {
    const url = new URL(AUTHORIZATION_ENDPOINT);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", scopes.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("prompt", "select_account");
    return url.toString();
  },
  exchangeCode: async ({ clientId, code, redirectUri, codeVerifier }) => {
    const response = await fetch(TOKEN_ENDPOINT, {
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
      throw new Error("Microsoft token exchange failed");
    }

    return toTokenResponse((await response.json()) as MicrosoftTokenPayload);
  },
  refreshToken: async ({ clientId, refreshToken }) => {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        scope: SCOPES.join(" "),
      }),
    });

    if (!response.ok) {
      throw new Error("Microsoft token refresh failed");
    }

    const payload = (await response.json()) as MicrosoftTokenPayload;
    return { ...toTokenResponse(payload), refreshToken: payload.refresh_token ?? refreshToken };
  },
  fetchProfile: async (accessToken) => {
    const response = await fetch(PROFILE_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Microsoft profile request failed");
    }

    const payload = (await response.json()) as MicrosoftProfile;

    return {
      providerAccountId: payload.id,
      displayName:
        payload.displayName || payload.mail || payload.userPrincipalName || "Outlook account",
      email: toEmail(payload.mail) ?? toEmail(payload.userPrincipalName),
    };
  },
};
