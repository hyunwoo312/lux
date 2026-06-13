import type { IntegrationProvider, IntegrationTokenResponse } from "@/integrations/types";

const AUTHORIZE_ENDPOINT = "https://github.com/login/oauth/authorize";
const TOKEN_RELAY_ENDPOINT = "https://lux.hyunwk.me/github/token";
const PROFILE_ENDPOINT = "https://api.github.com/user";

const SCOPES = ["read:user", "notifications", "repo"];

const NON_EXPIRING_TTL_SECONDS = 100 * 365 * 24 * 60 * 60;

type GitHubTokenPayload = {
  access_token?: string;
  scope?: string;
  token_type?: string;
};

type GitHubProfile = {
  id: number;
  login: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string;
};

function parseScopes(scope: string | undefined): string[] {
  const parsed = scope?.split(/[\s,]+/).filter(Boolean) ?? [];
  return parsed.length > 0 ? parsed : SCOPES;
}

export const githubProvider: IntegrationProvider = {
  id: "github",
  label: "GitHub",
  scopes: SCOPES,
  clientIdEnvKey: "VITE_GITHUB_CLIENT_ID",
  buildPkceAuthUrl: ({ clientId, redirectUri, state, scopes }) => {
    const url = new URL(AUTHORIZE_ENDPOINT);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", scopes.join(" "));
    url.searchParams.set("state", state);
    return url.toString();
  },
  exchangeCode: async ({ code, redirectUri }): Promise<IntegrationTokenResponse> => {
    const response = await fetch(TOKEN_RELAY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirectUri }),
    });

    if (!response.ok) {
      throw new Error("GitHub sign-in could not be completed");
    }

    const payload = (await response.json()) as GitHubTokenPayload;

    if (!payload.access_token) {
      throw new Error("GitHub sign-in could not be completed");
    }

    return {
      accessToken: payload.access_token,
      expiresIn: NON_EXPIRING_TTL_SECONDS,
      tokenType: payload.token_type ?? "bearer",
      scopes: parseScopes(payload.scope),
    };
  },
  fetchProfile: async (accessToken) => {
    const response = await fetch(PROFILE_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      throw new Error("GitHub profile request failed");
    }

    const payload = (await response.json()) as GitHubProfile;

    return {
      providerAccountId: String(payload.id),
      displayName: payload.name || payload.login,
      email: payload.email ?? undefined,
      avatarUrl: payload.avatar_url,
    };
  },
};
