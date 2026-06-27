import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import anilistIcon from "@/assets/service-icons/anilist.svg";
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
export const AnilistServiceIcon = createServiceIcon(anilistIcon, "Anilist");
const GITHUB_MASK = {
  maskImage: `url("${githubIcon}")`,
  WebkitMaskImage: `url("${githubIcon}")`,
  maskSize: "contain",
  WebkitMaskSize: "contain",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskPosition: "center",
  WebkitMaskPosition: "center",
  transform: "scale(1.15)",
} as const;

export function GitHubServiceIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("bg-primary inline-block size-6 shrink-0", className)}
      style={GITHUB_MASK}
    />
  );
}
