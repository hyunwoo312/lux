import { createPkceProvider } from "@/integrations/providers/pkce-provider";
import type { IntegrationProvider } from "@/integrations/types";

const PROFILE_ENDPOINT = "https://graph.microsoft.com/v1.0/me";

const SCOPES = ["offline_access", "User.Read", "Calendars.Read"];

type MicrosoftProfile = {
  id: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
};

function toEmail(value: string | undefined): string | undefined {
  return value && value.includes("@") ? value : undefined;
}

export const microsoftProvider: IntegrationProvider = createPkceProvider({
  id: "microsoft",
  label: "Outlook Calendar",
  scopes: SCOPES,
  authorizationEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  tokenEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  clientIdEnvKey: "VITE_MICROSOFT_CLIENT_ID",
  authParams: { prompt: "select_account" },
  includeScopeOnRefresh: true,
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
});
