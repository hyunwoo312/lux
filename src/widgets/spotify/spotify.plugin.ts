import { SpotifyServiceIcon } from "@/components/icons/service-icons";
import type { WidgetPlugin } from "@/widgets/core/types";
import { SpotifyWidget } from "@/widgets/spotify/SpotifyWidget";
import { SpotifyConfig } from "@/widgets/spotify/SpotifyConfig";
import { SpotifyStatus } from "@/widgets/spotify/SpotifyStatus";
import { SpotifyHeaderActions } from "@/widgets/spotify/SpotifyHeaderActions";
import { SpotifyBackdrop } from "@/widgets/spotify/components/SpotifyBackdrop";
import { SPOTIFY_TINT } from "@/widgets/spotify/types";

export const spotifyPlugin: WidgetPlugin = {
  type: "spotify",
  name: "Spotify",
  category: "media",
  description: "See what's playing and control playback",
  icon: SpotifyServiceIcon,
  brandIcon: true,
  defaultLayout: { w: 8, h: 5, minW: 8, minH: 5, maxW: 14, maxH: 14 },
  component: SpotifyWidget,
  configComponent: SpotifyConfig,
  statusComponent: SpotifyStatus,
  headerActionComponent: SpotifyHeaderActions,
  frame: { backdrop: SpotifyBackdrop, decorativeBackdrop: true },
  tint: SPOTIFY_TINT,
  requiresAccount: ["spotify"],
  removalNote: () => "Its settings will be reset — your Spotify account stays connected.",
};
