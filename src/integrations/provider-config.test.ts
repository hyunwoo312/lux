import { describe, expect, it, vi } from "vitest";
import { readSpotifyClientId, writeSpotifyClientId } from "@/integrations/provider-config";

describe("provider-config", () => {
  it("returns undefined when no Spotify client ID is stored", async () => {
    expect(await readSpotifyClientId()).toBeUndefined();
  });

  it("writes and reads the Spotify client ID", async () => {
    await writeSpotifyClientId("  client-abc  ");
    expect(await readSpotifyClientId()).toBe("client-abc");
  });

  it("clears the stored client ID when given a blank value", async () => {
    await writeSpotifyClientId("client-abc");
    await writeSpotifyClientId("   ");
    expect(await readSpotifyClientId()).toBeUndefined();
  });

  it("reports a save that never reached storage instead of resolving", async () => {
    vi.spyOn(chrome.storage.local, "set").mockRejectedValueOnce(new Error("storage down"));

    await expect(writeSpotifyClientId("client-abc")).rejects.toThrow(/storage down/);
    expect(await readSpotifyClientId()).toBeUndefined();
  });
});
