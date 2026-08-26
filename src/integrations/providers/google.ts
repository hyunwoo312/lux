import { z } from "zod";
import { IntegrationReconnectRequiredError } from "@/integrations/errors";
import { ensureOk, withTimeout, parseResponse } from "@/lib/net";
import type {
  AcquireTokenParams,
  IntegrationProvider,
  IntegrationTokenResponse,
} from "@/integrations/types";

const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo";

const ACCESS_TOKEN_TTL_SECONDS = 3600;

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/gmail.readonly",
];

const googleUserInfoSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
  picture: z.string().optional(),
});

async function evictCachedToken(token: string | undefined): Promise<void> {
  if (!token) return;
  await chrome.identity.removeCachedAuthToken({ token }).catch(() => undefined);
}

async function acquireToken({
  interactive,
  staleToken,
}: AcquireTokenParams): Promise<IntegrationTokenResponse> {
  await evictCachedToken(staleToken);

  const result = await chrome.identity
    .getAuthToken({ interactive, scopes: GOOGLE_SCOPES })
    .catch(() => undefined);
  const accessToken = result?.token;

  if (!accessToken) {
    if (interactive) {
      throw new Error("Google sign-in could not be completed");
    }
    throw new IntegrationReconnectRequiredError("Google Calendar needs to be reconnected");
  }

  const scopes = result?.grantedScopes ?? GOOGLE_SCOPES;

  if (!GOOGLE_SCOPES.every((scope) => scopes.includes(scope))) {
    await evictCachedToken(accessToken);
    throw new IntegrationReconnectRequiredError(
      "Google Calendar needs calendar access — reconnect and allow every permission",
    );
  }

  return {
    accessToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    tokenType: "Bearer",
    scopes,
  };
}

export const googleProvider: IntegrationProvider = {
  id: "google",
  label: "Google Calendar",
  scopes: GOOGLE_SCOPES,
  loadClientId: async () => chrome.runtime.getManifest().oauth2?.client_id,
  acquireToken,
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
};
