import { readSpotifyClientId } from "@/integrations/provider-config";
import { createPkceProvider } from "@/integrations/providers/pkce-provider";
import type { IntegrationProvider } from "@/integrations/types";

const PROFILE_ENDPOINT = "https://api.spotify.com/v1/me";

const SCOPES = ["user-read-playback-state", "user-modify-playback-state"];

type SpotifyProfile = {
  id: string;
  display_name?: string;
  email?: string;
  images?: Array<{ url?: string }>;
};

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
});
