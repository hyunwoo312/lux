import type { SpotifyPlaybackDevice } from "@/widgets/spotify/types";

type SpotifyDeviceChooserProps = {
  devices: SpotifyPlaybackDevice[];
  needsChoice: boolean;
  onSelect: (deviceId: string) => void;
};

export function SpotifyDeviceChooser({
  devices,
  needsChoice,
  onSelect,
}: SpotifyDeviceChooserProps) {
  if (devices.length === 0) {
    return (
      <p className="border-border/60 text-ink-3 border-b px-2 py-2 text-caption">
        Open Spotify on a device to start playback.
      </p>
    );
  }
  if (!needsChoice) return null;
  return (
    <div className="border-border/60 flex flex-wrap items-center gap-1 border-b px-2 pt-1.5 pb-2">
      <span className="text-ink-3 text-micro mr-0.5">Play on</span>
      {devices.map((device) => (
        <button
          key={device.id}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(device.id)}
          className="
            press cursor-pointer focus-ring border-border text-ink-3 rounded-full border px-2 py-0.5
            text-micro
            hover:text-ink hover:border-foreground/40
          "
        >
          {device.name}
        </button>
      ))}
    </div>
  );
}
