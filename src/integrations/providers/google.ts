import { createRelayProvider } from "@/integrations/providers/relay-provider";
import type { IntegrationProvider } from "@/integrations/types";

const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo";

type GoogleUserInfo = {
  id: string;
  name?: string;
  email?: string;
  picture?: string;
};

export const googleProvider: IntegrationProvider = createRelayProvider({
  id: "google",
  label: "Google Calendar",
  scopes: [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
  ],
  clientIdEnvKey: "VITE_GOOGLE_CLIENT_ID",
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  authParams: { access_type: "offline", prompt: "consent", include_granted_scopes: "true" },
  supportsRefresh: true,
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
});
