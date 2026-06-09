import { Settings2 } from "lucide-react";
import { IconActionButton } from "@/components/IconActionButton";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/settings";
import { ConfigSegmented, WidgetConfigGroup, WidgetConfigItem } from "@/components/config/WidgetConfig";
import { useSpotifyConnection } from "@/widgets/spotify/hooks/useSpotifyConnection";
import { useSpotifyStore } from "@/widgets/spotify/useSpotifyStore";
import type { SpotifyTimeDisplayMode } from "@/widgets/spotify/types";

const TIME_DISPLAY_OPTIONS: { value: SpotifyTimeDisplayMode; label: string }[] = [
  { value: "total", label: "Total" },
  { value: "remaining", label: "Remaining" },
];

export function SpotifyConfig() {
  const { account } = useSpotifyConnection();
  const timeDisplayMode = useSpotifyStore((s) => s.timeDisplayMode);
  const setTimeDisplayMode = useSpotifyStore((s) => s.setTimeDisplayMode);
  const ambient = useSpotifyStore((s) => s.ambient);
  const setAmbient = useSpotifyStore((s) => s.setAmbient);

  const accountDescription = account
    ? account.status === "needsReconnect"
      ? "Reconnect to resume playback."
      : (account.email ?? account.displayName ?? "Connected")
    : "Not connected.";

  return (
    <>
      <WidgetConfigGroup label="Account">
        <WidgetConfigItem
          title="Spotify"
          description={accountDescription}
          control={
            <IconActionButton
              icon={Settings2}
              label="Manage account"
              tooltip="Manage account"
              onClick={() => useSettingsStore.getState().openSettings("accounts")}
            />
          }
        />
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
