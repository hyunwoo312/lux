import type { ComponentProps } from "react";
import githubIcon from "@/assets/service-icons/github.svg";
import googleIcon from "@/assets/service-icons/google.svg";
import googleCalendarIcon from "@/assets/service-icons/google-calendar.svg";
import outlookIcon from "@/assets/service-icons/outlook.svg";
import spotifyIcon from "@/assets/service-icons/spotify.svg";

type ServiceIconProps = Omit<ComponentProps<"img">, "src" | "alt">;

function createServiceIcon(src: string, label: string) {
  function ServiceIcon(props: ServiceIconProps) {
    return <img src={src} alt="" aria-hidden draggable={false} {...props} />;
  }
  ServiceIcon.displayName = `${label}ServiceIcon`;
  return ServiceIcon;
}

export const GoogleCalendarServiceIcon = createServiceIcon(googleCalendarIcon, "GoogleCalendar");
export const OutlookServiceIcon = createServiceIcon(outlookIcon, "Outlook");
export const SpotifyServiceIcon = createServiceIcon(spotifyIcon, "Spotify");
export const GoogleServiceIcon = createServiceIcon(googleIcon, "Google");
export const GitHubServiceIcon = createServiceIcon(githubIcon, "GitHub");
