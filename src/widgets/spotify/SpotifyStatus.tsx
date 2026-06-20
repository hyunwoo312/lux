import { SpotifyServiceIcon } from "@/components/icons/service-icons";
import { Tooltip } from "@/components/ui/tooltip";
import { useSpotifyConnection } from "@/widgets/spotify/hooks/useSpotifyConnection";
import { SpotifySearch } from "@/widgets/spotify/SpotifySearch";

export function SpotifyStatus() {
  const { account } = useSpotifyConnection();

  if (account?.status === "connected") {
    return <SpotifySearch />;
  }

  return (
    <Tooltip content="Spotify not connected" solid>
      <span
        aria-label="Spotify not connected"
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
