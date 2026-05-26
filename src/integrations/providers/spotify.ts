import {
  IntegrationReconnectRequiredError,
  IntegrationTemporaryAuthError,
  isReconnectRequiredStatus,
} from "@/integrations/errors";
import type { IntegrationProvider, IntegrationTokenResponse } from "@/integrations/types";

const AUTHORIZATION_ENDPOINT = "https://accounts.spotify.com/authorize";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const PROFILE_ENDPOINT = "https://api.spotify.com/v1/me";

const SCOPES = ["user-read-playback-state", "user-modify-playback-state"];

type SpotifyProfile = {
  id: string;
  display_name?: string;
  email?: string;
  images?: Array<{ url?: string }>;
};

type SpotifyTokenPayload = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
};

function parseScopes(scope: string | undefined, fallback: string[]): string[] {
  return scope?.trim() ? scope.split(" ") : fallback;
}

function toTokenResponse(payload: SpotifyTokenPayload): IntegrationTokenResponse {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresIn: payload.expires_in,
    tokenType: payload.token_type,
    scopes: parseScopes(payload.scope, SCOPES),
  };
}

export const spotifyProvider: IntegrationProvider = {
  id: "spotify",
  label: "Spotify",
  scopes: SCOPES,
  clientIdEnvKey: "VITE_SPOTIFY_CLIENT_ID",
  buildPkceAuthUrl: ({ clientId, redirectUri, state, codeChallenge, scopes }) => {
    const url = new URL(AUTHORIZATION_ENDPOINT);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", scopes.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("show_dialog", "true");
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
      throw new Error("Spotify token exchange failed");
    }

    return toTokenResponse((await response.json()) as SpotifyTokenPayload);
  },
  refreshToken: async ({ clientId, refreshToken }) => {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      if (isReconnectRequiredStatus(response.status)) {
        throw new IntegrationReconnectRequiredError("Spotify needs to be reconnected");
      }
      throw new IntegrationTemporaryAuthError("Spotify is temporarily unavailable");
    }

    const payload = (await response.json()) as SpotifyTokenPayload;
    return { ...toTokenResponse(payload), refreshToken: payload.refresh_token ?? refreshToken };
  },
  fetchProfile: async (accessToken) => {
    const response = await fetch(PROFILE_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Spotify profile request failed");
    }

    const payload = (await response.json()) as SpotifyProfile;

    return {
      providerAccountId: payload.id,
      displayName: payload.display_name || payload.email || "Spotify account",
      email: payload.email,
      avatarUrl: payload.images?.[0]?.url,
    };
  },
};
