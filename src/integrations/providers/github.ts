import { createRelayProvider } from "@/integrations/providers/relay-provider";
import type { IntegrationProvider } from "@/integrations/types";

const PROFILE_ENDPOINT = "https://api.github.com/user";

const SCOPES = ["read:user", "notifications", "repo"];

const NON_EXPIRING_TTL_SECONDS = 100 * 365 * 24 * 60 * 60;

type GitHubProfile = {
  id: number;
  login: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string;
};

export const githubProvider: IntegrationProvider = createRelayProvider({
  id: "github",
  label: "GitHub",
  scopes: SCOPES,
  clientIdEnvKey: "VITE_GITHUB_CLIENT_ID",
  authorizationEndpoint: "https://github.com/login/oauth/authorize",
  supportsRefresh: false,
  defaultExpiresIn: NON_EXPIRING_TTL_SECONDS,
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
});
