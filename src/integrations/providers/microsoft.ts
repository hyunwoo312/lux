import { z } from "zod";
import { createRelayProvider } from "@/integrations/providers/relay-provider";
import { ensureOk, withTimeout, parseResponse } from "@/lib/net";
import type { CodeAuthProvider } from "@/integrations/types";

const PROFILE_ENDPOINT = "https://graph.microsoft.com/v1.0/me";

const SCOPES = ["offline_access", "User.Read", "Calendars.Read"];

const ACCESS_TOKEN_TTL_SECONDS = 3600;

function toEmail(value: string | undefined): string | undefined {
  return value && value.includes("@") ? value : undefined;
}

const microsoftProfileSchema = z.object({
  id: z.string(),
  displayName: z.string().optional(),
  mail: z.string().nullish(),
  userPrincipalName: z.string().nullish(),
});

export const microsoftProvider: CodeAuthProvider = createRelayProvider({
  id: "microsoft",
  label: "Outlook Calendar",
  scopes: SCOPES,
  clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
  authorizationEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  authParams: { prompt: "select_account" },
  supportsRefresh: true,
  defaultExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
  fetchProfile: async (accessToken) => {
    const response = await fetch(PROFILE_ENDPOINT, {
      signal: withTimeout(),
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    ensureOk(response, "Microsoft profile request failed");

    const payload = parseResponse(
      "Microsoft profile",
      microsoftProfileSchema,
      await response.json(),
    );

    return {
      providerAccountId: payload.id,
      displayName:
        payload.displayName || payload.mail || payload.userPrincipalName || "Outlook account",
      email: toEmail(payload.mail ?? undefined) ?? toEmail(payload.userPrincipalName ?? undefined),
    };
  },
});
