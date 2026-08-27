import { EASE_OUT } from "@/lib/motion";
import { type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useSettingsStore } from "@/settings";
import { Button } from "@/components/ui/button";
import { useElementSize } from "@/hooks/useElementSize";
import { SpotifyDeviceMenu } from "@/widgets/spotify/components/SpotifyDeviceMenu";
import { SpotifyEmptyState } from "@/widgets/spotify/components/SpotifyEmptyState";
import { SpotifyBar } from "@/widgets/spotify/components/SpotifyBar";
import { SpotifyPlayer } from "@/widgets/spotify/components/SpotifyPlayer";
import { SpotifyQueuePanel } from "@/widgets/spotify/components/SpotifyQueuePanel";
import { useSpotifyConnection } from "@/widgets/spotify/hooks/useSpotifyConnection";
import { useSpotifyPlayback } from "@/widgets/spotify/hooks/useSpotifyPlayback";
import { useSpotify } from "@/widgets/spotify/useSpotifyStore";
import type { SpotifyPlaybackError } from "@/widgets/spotify/types";

const STACKED_MIN_HEIGHT = 260;
const ROOMY_MIN_WIDTH = 320;

type ErrorCopy = { title: string; message: string };

function getErrorCopy(error: SpotifyPlaybackError): ErrorCopy {
  switch (error.kind) {
    case "premium":
      return {
        title: "Premium required",
        message: "Spotify requires Premium to control playback from other apps.",
      };
    case "noDevice":
      return {
        title: "No active device",
        message: "Open Spotify on a device, start playback, then refresh.",
      };
    case "unknown":
      return { title: "Spotify unavailable", message: error.message };
  }
}

export function SpotifyWidget() {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const reduced = useReducedMotion();
  const { account, loaded } = useSpotifyConnection();
  const openAccounts = () => useSettingsStore.getState().openSettings("accounts");
  const connected = account?.status === "connected";
  const controller = useSpotifyPlayback(connected);
  const timeDisplayMode = useSpotify((d) => d.timeDisplayMode);
  const queueView = useSpotify((d) => d.queueView);

  const view = size.height >= STACKED_MIN_HEIGHT ? "stacked" : "bar";
  const roomy = size.width >= ROOMY_MIN_WIDTH;

  let content: ReactNode;
  if (!loaded) {
    content = <SpotifyEmptyState title="Loading Spotify" message="Checking your account." />;
  } else if (!account) {
    content = (
      <SpotifyEmptyState
        title="Connect Spotify"
        message="Connect Spotify to see and control playback."
        action={<Button onClick={openAccounts}>Connect Spotify</Button>}
      />
    );
  } else if (!connected) {
    content = (
      <SpotifyEmptyState
        title="Reconnect Spotify"
        message={account.lastError ?? "Spotify needs a fresh connection."}
        action={<Button onClick={openAccounts}>Reconnect</Button>}
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
          <Button
            onClick={() => void controller.refresh()}
            disabled={controller.pendingActions.has("refresh")}
          >
            {controller.pendingActions.has("refresh") ? "Refreshing…" : "Retry"}
          </Button>
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
          transition={{ duration: reduced ? 0 : 0.2, ease: EASE_OUT }}
          className="h-full min-h-0"
        >
          {queueView ? (
            <SpotifyQueuePanel />
          ) : view === "bar" ? (
            <SpotifyBar
              controller={controller}
              playback={controller.playback}
              timeDisplayMode={timeDisplayMode}
              roomy={roomy}
              size={size}
            />
          ) : (
            <SpotifyPlayer
              controller={controller}
              playback={controller.playback}
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
        action={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => void controller.refresh()}
              disabled={controller.pendingActions.has("refresh")}
            >
              {controller.pendingActions.has("refresh") ? "Refreshing…" : "Refresh"}
            </Button>
            <SpotifyDeviceMenu
              devices={controller.deviceOptions}
              activeId=""
              disabled={false}
              loading={controller.devicesLoading}
              error={controller.devicesError}
              onSelect={controller.transferDevice}
              onOpen={() => void controller.loadDevices()}
            />
          </div>
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
