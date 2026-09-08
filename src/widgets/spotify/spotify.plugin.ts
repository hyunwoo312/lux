import { SpotifyServiceIcon } from "@/components/icons/service-icons";
import type { WidgetPlugin } from "@/widgets/core/types";
import { SpotifyWidget } from "@/widgets/spotify/SpotifyWidget";
import { SpotifyConfig } from "@/widgets/spotify/SpotifyConfig";
import { SpotifyStatus } from "@/widgets/spotify/SpotifyStatus";
import { SpotifyHeaderActions } from "@/widgets/spotify/SpotifyHeaderActions";
import { SpotifyBackdrop } from "@/widgets/spotify/components/SpotifyBackdrop";
import { SPOTIFY_TINT } from "@/widgets/spotify/types";
import { useSpotifyStore } from "@/widgets/spotify/useSpotifyStore";
import { spotifyCommands } from "@/widgets/spotify/commands";

export const spotifyPlugin: WidgetPlugin = {
  type: "spotify",
  name: "Spotify",
  category: "media",
  description: "See what's playing and control playback",
  icon: SpotifyServiceIcon,
  brandIcon: true,
  component: SpotifyWidget,
  clearInstance: (instanceId) => useSpotifyStore.getState().removeInstance(instanceId),
  configComponent: SpotifyConfig,
  statusComponent: SpotifyStatus,
  headerActionComponent: SpotifyHeaderActions,
  frame: { backdrop: SpotifyBackdrop, decorativeBackdrop: true },
  tint: SPOTIFY_TINT,
  requiresAccount: ["spotify"],
  signedOut: { mode: "lock", label: "Spotify", subject: "what is playing" },
  removalNote: () => "Its settings will be reset — your Spotify account stays connected.",
  commands: spotifyCommands,
};
