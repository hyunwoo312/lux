import { ListMusic, Music } from "lucide-react";
import { ViewToggleButton } from "@/widgets/core/ViewToggleButton";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { useSpotifyPlaybackStore } from "@/widgets/spotify/hooks/useSpotifyPlayback";
import { SpotifyOpenLink } from "@/widgets/spotify/SpotifyOpenLink";
import { useSpotify, useSpotifyStore } from "@/widgets/spotify/useSpotifyStore";

export function SpotifyHeaderActions() {
  const hasPlayback = useSpotifyPlaybackStore((s) => s.playback !== null);

  return (
    <div className="flex items-center gap-0.5">
      {hasPlayback && <SpotifyQueueToggle />}
      <SpotifyOpenLink />
    </div>
  );
}

function SpotifyQueueToggle() {
  const instanceId = useWidgetInstanceId();
  const queueView = useSpotify((d) => d.queueView);
  const setQueueView = useSpotifyStore((s) => s.setQueueView);

  return (
    <ViewToggleButton
      targetKey={queueView ? "player" : "queue"}
      targetLabel={queueView ? "player" : "queue"}
      icon={queueView ? Music : ListMusic}
      onToggle={() => setQueueView(instanceId, !queueView)}
    />
  );
}
