import { SpotifyServiceIcon } from "@/components/icons/service-icons";
import type { WidgetPlugin } from "@/widgets/core/types";
import { SpotifyWidget } from "@/widgets/spotify/SpotifyWidget";
import { SpotifyConfig } from "@/widgets/spotify/SpotifyConfig";
import { SpotifyStatus } from "@/widgets/spotify/SpotifyStatus";
import { SpotifyOpenLink } from "@/widgets/spotify/SpotifyOpenLink";
import { SpotifyBackdrop } from "@/widgets/spotify/components/SpotifyBackdrop";
import { SPOTIFY_ACCENT } from "@/widgets/spotify/types";

export const spotifyPlugin: WidgetPlugin = {
  type: "spotify",
  name: "Spotify",
  icon: SpotifyServiceIcon,
  brandIcon: true,
  defaultLayout: { w: 6, h: 6, minW: 6, minH: 4, maxW: 12, maxH: 12 },
  component: SpotifyWidget,
  configComponent: SpotifyConfig,
  statusComponent: SpotifyStatus,
  headerActionComponent: SpotifyOpenLink,
  backdropComponent: SpotifyBackdrop,
  decorativeBackdrop: true,
  accent: SPOTIFY_ACCENT,
  removalNote: () => "Its settings will be reset — your Spotify account stays connected.",
};
