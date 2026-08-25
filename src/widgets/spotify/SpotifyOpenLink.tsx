import { SpotifyServiceIcon } from "@/components/icons/service-icons";
import { Tooltip } from "@/components/ui/tooltip";
import { useSpotifyPlaybackStore } from "@/widgets/spotify/hooks/useSpotifyPlayback";

export function SpotifyOpenLink() {
  const trackId = useSpotifyPlaybackStore((s) => s.playback?.track.id ?? null);
  if (!trackId) return null;

  return (
    <Tooltip content="Open in Spotify" solid>
      <a
        href={`https://open.spotify.com/track/${trackId}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Open current track in Spotify"
        className="
          focus-ring text-ink-3
          hover:text-ink hover:bg-foreground/5
          grid size-7 place-items-center rounded-sm transition-colors
          [&_img]:size-4
        "
      >
        <SpotifyServiceIcon />
      </a>
    </Tooltip>
  );
}
