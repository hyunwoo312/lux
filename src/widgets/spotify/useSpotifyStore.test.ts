import { beforeEach, describe, expect, it } from "vitest";
import { useSpotifyStore } from "@/widgets/spotify/useSpotifyStore";

const store = () => useSpotifyStore.getState();

beforeEach(() => {
  useSpotifyStore.setState({ byInstance: {} });
});

describe("useSpotifyStore", () => {
  it("keeps display settings independent per instance", () => {
    store().setTimeDisplayMode("a", "remaining");
    store().setTimeDisplayMode("b", "total");

    expect(store().byInstance["a"]?.timeDisplayMode).toBe("remaining");
    expect(store().byInstance["b"]?.timeDisplayMode).toBe("total");
  });

  it("drops an instance on cleanup", () => {
    store().setTimeDisplayMode("a", "remaining");
    store().removeInstance("a");
    expect(store().byInstance["a"]).toBeUndefined();
  });

  describe("migrate", () => {
    const migrate = useSpotifyStore.persist.getOptions().migrate;

    it("migrates legacy singleton data under the spotify instance key", () => {
      expect(migrate?.({ timeDisplayMode: "remaining", ambient: false }, 1)).toEqual({
        byInstance: { spotify: { timeDisplayMode: "remaining" } },
      });
    });

    it("drops unrecognized legacy data", () => {
      expect(migrate?.({ timeDisplayMode: "bogus" }, 1)).toEqual({ byInstance: {} });
    });

    it("passes current-version data through unchanged", () => {
      const persisted = {
        byInstance: { "spotify-1": { timeDisplayMode: "total" } },
      };
      expect(migrate?.(persisted, 2)).toBe(persisted);
    });
  });
});
