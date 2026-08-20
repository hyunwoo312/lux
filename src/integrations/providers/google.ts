import { z } from "zod";
import { createRelayProvider } from "@/integrations/providers/relay-provider";
import { ensureOk, withTimeout, parseResponse } from "@/lib/net";
import type { IntegrationProvider } from "@/integrations/types";

const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo";

const ACCESS_TOKEN_TTL_SECONDS = 3600;

const googleUserInfoSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
  picture: z.string().optional(),
});

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
  defaultExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
  fetchProfile: async (accessToken) => {
    const response = await fetch(USERINFO_ENDPOINT, {
      signal: withTimeout(),
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    ensureOk(response, "Google profile request failed");

    const payload = parseResponse("Google profile", googleUserInfoSchema, await response.json());

    return {
      providerAccountId: payload.id,
      displayName: payload.name || payload.email || "Google account",
      email: payload.email,
      avatarUrl: payload.picture,
    };
  },
});
