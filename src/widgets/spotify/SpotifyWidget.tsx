import { type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useSettingsStore } from "@/settings";
import { useElementSize } from "@/hooks/useElementSize";
import { SpotifyDeviceMenu } from "@/widgets/spotify/components/SpotifyDeviceMenu";
import { SpotifyEmptyState } from "@/widgets/spotify/components/SpotifyEmptyState";
import { SpotifyPlayer } from "@/widgets/spotify/components/SpotifyPlayer";
import { SpotifyQueuePanel } from "@/widgets/spotify/components/SpotifyQueuePanel";
import { useSpotifyConnection } from "@/widgets/spotify/hooks/useSpotifyConnection";
import { useSpotifyPlayback } from "@/widgets/spotify/hooks/useSpotifyPlayback";
import { useSpotify } from "@/widgets/spotify/useSpotifyStore";
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
  const reduced = useReducedMotion();
  const { account, loaded } = useSpotifyConnection();
  const openAccounts = () => useSettingsStore.getState().openSettings("accounts");
  const connected = account?.status === "connected";
  const controller = useSpotifyPlayback(Boolean(connected));
  const timeDisplayMode = useSpotify((d) => d.timeDisplayMode);
  const queueView = useSpotify((d) => d.queueView);

  const view = getViewMode(size);

  let content: ReactNode;
  if (!loaded) {
    content = <SpotifyEmptyState title="Loading Spotify" message="Checking your account." />;
  } else if (!account) {
    content = (
      <SpotifyEmptyState
        title="Connect Spotify"
        message="Connect Spotify to see and control playback."
        action={{ label: "Connect Spotify", onClick: openAccounts }}
      />
    );
  } else if (!connected) {
    content = (
      <SpotifyEmptyState
        title="Reconnect Spotify"
        message={account.lastError ?? "Spotify needs a fresh connection."}
        action={{ label: "Reconnect", onClick: openAccounts }}
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
            ? { label: "Reconnect", onClick: openAccounts }
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
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={queueView ? "queue" : "player"}
          initial={reduced ? { opacity: 0 } : { opacity: 0, x: queueView ? 16 : -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, x: queueView ? 16 : -16 }}
          transition={{ duration: reduced ? 0 : 0.2, ease: "easeOut" }}
          className="h-full min-h-0"
        >
          {queueView ? (
            <SpotifyQueuePanel />
          ) : (
            <SpotifyPlayer
              controller={controller}
              playback={controller.playback}
              view={view}
              timeDisplayMode={timeDisplayMode}
            />
          )}
        </motion.div>
      </AnimatePresence>
    );
  } else {
    content = (
      <SpotifyEmptyState
        title="Nothing playing"
        message="Pick a device, or start Spotify anywhere to begin."
        action={{
          label: controller.pendingActions.has("refresh") ? "Refreshing…" : "Refresh",
          onClick: () => void controller.refresh(),
          disabled: controller.pendingActions.has("refresh"),
        }}
        extra={
          <SpotifyDeviceMenu
            devices={controller.deviceOptions}
            activeId=""
            disabled={false}
            onSelect={controller.transferDevice}
            onOpen={() => void controller.loadDevices()}
          />
        }
      />
    );
  }

  return (
    <div ref={ref} className="h-full min-h-0">
      {content}
    </div>
  );
}
