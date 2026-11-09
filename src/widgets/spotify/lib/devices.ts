import type { SpotifyPlaybackDevice } from "@/widgets/spotify/types";

export const NO_DEVICE_MESSAGE = "Open Spotify on a device first, then try again.";

export function resolveSpotifyDevice(
  devices: readonly SpotifyPlaybackDevice[],
): SpotifyPlaybackDevice | undefined {
  return (
    devices.find((device) => device.isActive) ?? (devices.length === 1 ? devices[0] : undefined)
  );
}

export function anySpotifyDevice(
  devices: readonly SpotifyPlaybackDevice[],
): SpotifyPlaybackDevice | undefined {
  return devices.find((device) => device.isActive) ?? devices[0];
}
