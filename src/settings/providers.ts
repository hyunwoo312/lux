import type { ComponentType } from "react";
import {
  AnilistServiceIcon,
  GitHubServiceIcon,
  GoogleServiceIcon,
  OutlookServiceIcon,
  SpotifyServiceIcon,
} from "@/components/icons/service-icons";
import type { IntegrationProviderId } from "@/integrations";

type ProviderMeta = {
  id: IntegrationProviderId;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

export const PROVIDERS: ProviderMeta[] = [
  {
    id: "google",
    label: "Google",
    description: "Reads your calendar and email address — read-only.",
    icon: GoogleServiceIcon,
  },
  {
    id: "microsoft",
    label: "Outlook",
    description: "Reads your calendar and profile — read-only.",
    icon: OutlookServiceIcon,
  },
  {
    id: "spotify",
    label: "Spotify",
    description: "Controls playback; reads your library and playlists.",
    icon: SpotifyServiceIcon,
  },
  {
    id: "github",
    label: "GitHub",
    description: "Reads your profile, notifications, watched repos, and private repos.",
    icon: GitHubServiceIcon,
  },
  {
    id: "anilist",
    label: "AniList",
    description: "Reads your lists and inbox; AniList grants full access.",
    icon: AnilistServiceIcon,
  },
];
