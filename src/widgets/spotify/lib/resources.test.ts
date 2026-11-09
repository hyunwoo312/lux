import { describe, expect, it } from "vitest";
import { spotifyLikedTracks } from "@/widgets/spotify/lib/resources";

const row = { id: "t1", uri: "spotify:track:t1", kind: "track", title: "Lullaby", subtitle: "A" };

describe("cached Spotify library rows", () => {
  it("refetches songs cached without their album, which cannot start on a device", () => {
    expect(spotifyLikedTracks.parse([row])).toBeNull();
  });

  it("keeps songs that carry their album", () => {
    const cached = [{ ...row, albumUri: "spotify:album:a1" }];
    expect(spotifyLikedTracks.parse(cached)).toEqual(cached);
  });
});
