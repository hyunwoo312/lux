import { useEffect, type ReactNode } from "react";
import { useElementSize } from "@/hooks/useElementSize";
import { SpotifyEmptyState } from "@/widgets/spotify/components/SpotifyEmptyState";
import { SpotifyPlayer } from "@/widgets/spotify/components/SpotifyPlayer";
import { useSpotifyConnection } from "@/widgets/spotify/hooks/useSpotifyConnection";
import { useSpotifyPlayback } from "@/widgets/spotify/hooks/useSpotifyPlayback";
import { useSpotifyStore } from "@/widgets/spotify/useSpotifyStore";
import type { ElementSize } from "@/hooks/useElementSize";
import type { SpotifyResponsiveView } from "@/widgets/spotify/types";

function getViewMode({ width, height }: ElementSize): SpotifyResponsiveView {
  if (height >= 300 && width >= 250) return "expanded";
  if (height >= 140) return "details";
  return "compact";
}

type ErrorCopy = { title: string; message: string; reconnect: boolean };

function getErrorCopy(error: string): ErrorCopy {
  if (error.includes("Premium")) {
    return {
      title: "Premium required",
      message: "Spotify requires Premium to control playback from other apps.",
      reconnect: false,
    };
  }
  if (error.includes("Open Spotify on a device")) {
    return {
      title: "No active device",
      message: "Open Spotify on a device, start playback, then refresh.",
      reconnect: false,
    };
  }
  if (error.includes("reconnected") || error.includes("not connected")) {
    return {
      title: "Reconnect Spotify",
      message: "Your Spotify session needs a fresh connection.",
      reconnect: true,
    };
  }
  return { title: "Spotify unavailable", message: error, reconnect: false };
}

export function SpotifyWidget() {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const { account, loaded, busy, error: connectionError, connect } = useSpotifyConnection();
  const connected = account?.status === "connected";
  const controller = useSpotifyPlayback(Boolean(connected));
  const timeDisplayMode = useSpotifyStore((s) => s.timeDisplayMode);
  const setNowPlaying = useSpotifyStore((s) => s.setNowPlaying);

  const track = controller.playback?.track;
  useEffect(() => {
    setNowPlaying(track?.id ?? null, track?.artworkUrl ?? null);
  }, [track?.id, track?.artworkUrl, setNowPlaying]);

  const view = getViewMode(size);
  const connecting = busy === "connecting";

  let content: ReactNode;
  if (!loaded) {
    content = <SpotifyEmptyState title="Loading Spotify" message="Checking your account." />;
  } else if (!account) {
    content = (
      <SpotifyEmptyState
        title="Connect Spotify"
        message={connectionError ?? "Connect Spotify to see and control playback."}
        action={{
          label: connecting ? "Connecting…" : "Connect Spotify",
          onClick: () => void connect(),
          disabled: connecting,
        }}
      />
    );
  } else if (!connected) {
    content = (
      <SpotifyEmptyState
        title="Reconnect Spotify"
        message={connectionError ?? account.lastError ?? "Spotify needs a fresh connection."}
        action={{
          label: connecting ? "Reconnecting…" : "Reconnect",
          onClick: () => void connect(),
          disabled: connecting,
        }}
      />
    );
  } else if (controller.isLoading) {
    content = <SpotifyEmptyState title="Loading Spotify" message="Checking current playback." />;
  } else if (controller.error) {
    const copy = getErrorCopy(controller.error);
    content = (
      <SpotifyEmptyState
        title={copy.title}
        message={copy.message}
        action={
          copy.reconnect
            ? {
                label: connecting ? "Reconnecting…" : "Reconnect",
                onClick: () => void connect(),
                disabled: connecting,
              }
            : {
                label: controller.pendingActions.has("refresh") ? "Refreshing…" : "Retry",
                onClick: () => void controller.refresh(),
                disabled: controller.pendingActions.has("refresh"),
              }
        }
      />
    );
  } else if (controller.playback) {
    content = (
      <SpotifyPlayer
        controller={controller}
        playback={controller.playback}
        view={view}
        timeDisplayMode={timeDisplayMode}
      />
    );
  } else {
    content = (
      <SpotifyEmptyState
        title="Nothing playing"
        message="Start Spotify on any device and this widget will follow along."
        action={{
          label: controller.pendingActions.has("refresh") ? "Refreshing…" : "Refresh",
          onClick: () => void controller.refresh(),
          disabled: controller.pendingActions.has("refresh"),
        }}
      />
    );
  }

  return (
    <div ref={ref} className="h-full min-h-0">
      {content}
    </div>
  );
}
