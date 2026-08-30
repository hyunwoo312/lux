import { describe, expect, it } from "vitest";
import { anySpotifyDevice, resolveSpotifyDevice } from "@/widgets/spotify/lib/devices";
import type { SpotifyPlaybackDevice } from "@/widgets/spotify/types";

const device = (id: string, isActive: boolean): SpotifyPlaybackDevice => ({
  id,
  name: id,
  type: "Computer",
  isActive,
  volumePercent: 50,
});

describe("device resolution", () => {
  it("leaves the choice open when several devices are idle", () => {
    expect(resolveSpotifyDevice([device("a", false), device("b", false)])).toBeUndefined();
  });

  it("takes any idle device where there is no room to ask", () => {
    expect(anySpotifyDevice([device("a", false), device("b", false)])?.id).toBe("a");
  });

  it("prefers the device already playing either way", () => {
    const devices = [device("a", false), device("b", true)];
    expect(resolveSpotifyDevice(devices)?.id).toBe("b");
    expect(anySpotifyDevice(devices)?.id).toBe("b");
  });

  it("resolves nothing when Spotify is open nowhere", () => {
    expect(anySpotifyDevice([])).toBeUndefined();
  });
});
