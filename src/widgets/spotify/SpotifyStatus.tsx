import { SpotifyServiceIcon } from "@/components/icons/service-icons";
import { Tooltip } from "@/components/ui/tooltip";
import { useSpotifyStore } from "@/widgets/spotify/useSpotifyStore";

export function SpotifyStatus() {
  const trackId = useSpotifyStore((s) => s.nowPlayingTrackId);

  if (trackId) {
    return (
      <Tooltip content="Open in Spotify" solid>
        <a
          href={`https://open.spotify.com/track/${trackId}`}
          target="_blank"
          rel="noreferrer"
          aria-label="Open current track in Spotify"
          className="
            inline-flex size-5 items-center justify-center rounded-sm transition
            hover:opacity-80
            focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none
            [&_img]:size-4
          "
        >
          <SpotifyServiceIcon />
        </a>
      </Tooltip>
    );
  }

  return (
    <Tooltip content="No track playing" solid>
      <span
        aria-label="No track playing"
        className="
          inline-flex size-5 items-center justify-center
          [&_img]:size-4 [&_img]:opacity-45 [&_img]:grayscale
        "
      >
        <SpotifyServiceIcon />
      </span>
    </Tooltip>
  );
}
