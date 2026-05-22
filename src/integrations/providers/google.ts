import type { IntegrationProvider } from "@/integrations/types";

const AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo";

type GoogleUserInfo = {
  id: string;
  name?: string;
  email?: string;
  picture?: string;
};

export const googleProvider: IntegrationProvider = {
  id: "google",
  label: "Google Calendar",
  scopes: [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
  ],
  clientIdEnvKey: "VITE_GOOGLE_CLIENT_ID",
  buildAuthUrl: ({ clientId, redirectUri, state, scopes }) => {
    const url = new URL(AUTHORIZATION_ENDPOINT);
    url.searchParams.set("response_type", "token");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", scopes.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("prompt", "consent");
    return url.toString();
  },
  fetchProfile: async (accessToken) => {
    const response = await fetch(USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Google profile request failed");
    }

    const payload = (await response.json()) as GoogleUserInfo;

    return {
      providerAccountId: payload.id,
      displayName: payload.name || payload.email || "Google account",
      email: payload.email,
      avatarUrl: payload.picture,
    };
  },
};
