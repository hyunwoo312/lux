import { z } from "zod";
import { readSpotifyClientId } from "@/integrations/provider-config";
import { ensureOk, withTimeout, parseResponse } from "@/lib/net";
import { createPkceProvider } from "@/integrations/providers/pkce-provider";
import type { IntegrationProvider } from "@/integrations/types";

const PROFILE_ENDPOINT = "https://api.spotify.com/v1/me";

const SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-library-read",
  "playlist-read-private",
];

const spotifyProfileSchema = z.object({
  id: z.string(),
  display_name: z.string().nullish(),
  email: z.string().optional(),
  images: z.array(z.object({ url: z.string().optional() })).optional(),
});

export const spotifyProvider: IntegrationProvider = createPkceProvider({
  id: "spotify",
  label: "Spotify",
  scopes: SCOPES,
  authorizationEndpoint: "https://accounts.spotify.com/authorize",
  tokenEndpoint: "https://accounts.spotify.com/api/token",
  loadClientId: readSpotifyClientId,
  authParams: { show_dialog: "true" },
  fetchProfile: async (accessToken) => {
    const response = await fetch(PROFILE_ENDPOINT, {
      signal: withTimeout(),
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    ensureOk(response, "Spotify profile request failed");

    const payload = parseResponse("Spotify profile", spotifyProfileSchema, await response.json());

    return {
      providerAccountId: payload.id,
      displayName: payload.display_name || payload.email || "Spotify account",
      email: payload.email,
      avatarUrl: payload.images?.[0]?.url,
    };
  },
});
