import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConfigSegmented, WidgetConfigGroup, WidgetConfigItem } from "@/widgets/core/WidgetConfig";
import { useSpotifyConnection } from "@/widgets/spotify/hooks/useSpotifyConnection";
import { useSpotifyStore } from "@/widgets/spotify/useSpotifyStore";
import type { SpotifyTimeDisplayMode } from "@/widgets/spotify/types";

const TIME_DISPLAY_OPTIONS: { value: SpotifyTimeDisplayMode; label: string }[] = [
  { value: "total", label: "Total" },
  { value: "remaining", label: "Remaining" },
];

export function SpotifyConfig() {
  const { account, busy, error, connect, disconnect } = useSpotifyConnection();
  const timeDisplayMode = useSpotifyStore((s) => s.timeDisplayMode);
  const setTimeDisplayMode = useSpotifyStore((s) => s.setTimeDisplayMode);
  const ambient = useSpotifyStore((s) => s.ambient);
  const setAmbient = useSpotifyStore((s) => s.setAmbient);

  const connected = Boolean(account);
  const needsReconnect = account?.status === "needsReconnect";
  const description = needsReconnect
    ? "Reconnect to resume playback."
    : (account?.email ?? account?.displayName ?? "Connect to control playback.");

  return (
    <>
      <WidgetConfigGroup label="Account">
        <WidgetConfigItem
          title="Spotify"
          description={description}
          control={
            connected ? undefined : (
              <Button size="sm" onClick={connect} disabled={busy === "connecting"}>
                {busy === "connecting" ? "Connecting…" : "Connect"}
              </Button>
            )
          }
        >
          {connected && (
            <div className="flex flex-col gap-3">
              {needsReconnect ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={connect}
                  disabled={busy === "connecting"}
                >
                  {busy === "connecting" ? "Reconnecting…" : "Reconnect"}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={disconnect}
                  disabled={busy === "disconnecting"}
                >
                  {busy === "disconnecting" ? "Disconnecting…" : "Disconnect"}
                </Button>
              )}
              {error && <p className="text-destructive text-2xs">{error}</p>}
            </div>
          )}
        </WidgetConfigItem>
      </WidgetConfigGroup>

      <WidgetConfigGroup label="Display">
        <WidgetConfigItem
          title="Right time"
          description="Show total duration or time remaining"
          control={
            <ConfigSegmented
              label="Right time"
              value={timeDisplayMode}
              options={TIME_DISPLAY_OPTIONS}
              onChange={setTimeDisplayMode}
            />
          }
        />
        <WidgetConfigItem
          title="Ambient artwork"
          description="Blur the album art behind the player"
          control={
            <Switch
              checked={ambient}
              onCheckedChange={(checked) => setAmbient(checked === true)}
              aria-label="Ambient album artwork"
            />
          }
        />
      </WidgetConfigGroup>
    </>
  );
}
