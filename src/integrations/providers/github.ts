import { z } from "zod";
import { createRelayProvider } from "@/integrations/providers/relay-provider";
import { ensureOk, withTimeout, parseResponse } from "@/lib/net";
import type { CodeAuthProvider } from "@/integrations/types";

const PROFILE_ENDPOINT = "https://api.github.com/user";

const SCOPES = ["read:user", "notifications", "repo"];

const NON_EXPIRING_TTL_SECONDS = 100 * 365 * 24 * 60 * 60;

const githubProfileSchema = z.object({
  id: z.union([z.string(), z.number()]),
  login: z.string(),
  name: z.string().nullish(),
  email: z.string().nullish(),
  avatar_url: z.string().optional(),
});

export const githubProvider: CodeAuthProvider = createRelayProvider({
  id: "github",
  label: "GitHub",
  scopes: SCOPES,
  clientIdEnvKey: "VITE_GITHUB_CLIENT_ID",
  authorizationEndpoint: "https://github.com/login/oauth/authorize",
  supportsRefresh: false,
  defaultExpiresIn: NON_EXPIRING_TTL_SECONDS,
  fetchProfile: async (accessToken) => {
    const response = await fetch(PROFILE_ENDPOINT, {
      signal: withTimeout(),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    ensureOk(response, "GitHub profile request failed");

    const payload = parseResponse("GitHub profile", githubProfileSchema, await response.json());

    return {
      providerAccountId: String(payload.id),
      displayName: payload.name || payload.login,
      email: payload.email ?? undefined,
      avatarUrl: payload.avatar_url,
    };
  },
});
