import { Settings2 } from "lucide-react";
import { IconActionButton } from "@/components/IconActionButton";
import { useProviderAccount } from "@/integrations";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { ConfigSegmented, ConfigSection, ConfigRow } from "@/components/config/Config";
import { useSpotify, useSpotifyStore } from "@/widgets/spotify/useSpotifyStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type { SpotifyTimeDisplayMode } from "@/widgets/spotify/types";

const TIME_DISPLAY_OPTIONS: { value: SpotifyTimeDisplayMode; label: string }[] = [
  { value: "total", label: "Total" },
  { value: "remaining", label: "Remaining" },
];

export function SpotifyConfig() {
  const { account } = useProviderAccount("spotify");
  const instanceId = useWidgetInstanceId();
  const timeDisplayMode = useSpotify((d) => d.timeDisplayMode);
  const setTimeDisplayMode = useSpotifyStore((s) => s.setTimeDisplayMode);

  const accountDescription = account
    ? account.status === "needsReconnect"
      ? "Reconnect to resume playback."
      : (account.email ?? account.displayName ?? "Connected")
    : "Not connected — connect to control playback.";

  return (
    <>
      <ConfigSection title="Account">
        <ConfigRow
          title="Spotify"
          description={accountDescription}
          control={
            <IconActionButton
              icon={Settings2}
              label={account ? "Manage account" : "Connect in Settings"}
              tooltip={account ? "Manage account" : "Connect in Settings"}
              onClick={() => useSettingsStore.getState().openSettings("accounts")}
            />
          }
        />
      </ConfigSection>

      <ConfigSection title="Display">
        <ConfigRow
          title="Right time"
          description="Show total duration or time remaining"
          control={
            <ConfigSegmented
              label="Right time"
              value={timeDisplayMode}
              options={TIME_DISPLAY_OPTIONS}
              onChange={(value) => setTimeDisplayMode(instanceId, value)}
            />
          }
        />
      </ConfigSection>
    </>
  );
}
