import { beforeEach, describe, expect, it } from "vitest";
import { ANILIST_SYNC_COOLDOWN_MS, useAnilistStore } from "@/widgets/anilist/useAnilistStore";

const store = () => useAnilistStore.getState();

beforeEach(() => {
  useAnilistStore.setState({
    byInstance: {},
    lastSeenActivityAt: undefined,
    syncNonce: 0,
    syncing: false,
    lastSyncAt: undefined,
  });
});

describe("useAnilistStore", () => {
  it("keeps view settings independent per instance", () => {
    store().setActiveTab("a", "inbox");
    store().setTitleLanguage("b", "romaji");

    expect(store().byInstance["a"]?.activeTab).toBe("inbox");
    expect(store().byInstance["a"]?.titleLanguage).toBe("english");
    expect(store().byInstance["b"]?.titleLanguage).toBe("romaji");
    expect(store().byInstance["b"]?.activeTab).toBe("activity");
  });

  it("defaults a new instance to sorting by highest score", () => {
    expect(store().byInstance["fresh"]).toBeUndefined();
    store().setActiveTab("fresh", "library");
    expect(store().byInstance["fresh"]?.currentSort).toBe("score");
  });

  it("drops an instance's view settings on cleanup", () => {
    store().setActiveTab("a", "library");
    store().removeInstance("a");
    expect(store().byInstance["a"]).toBeUndefined();
  });

  it("shares last-seen markers across instances and only advances forward", () => {
    store().setLastSeenActivity(100);
    store().setLastSeenActivity(50);
    expect(store().lastSeenActivityAt).toBe(100);
  });

  it("shares sync state and honors the cooldown", () => {
    const first = store().requestSync("english", 1);
    expect(first).toEqual({ ok: true, remainingMs: 0 });
    expect(store().syncNonce).toBe(1);

    const second = store().requestSync("romaji", 1);
    expect(second.ok).toBe(false);
    expect(second.remainingMs).toBeGreaterThan(0);
    expect(second.remainingMs).toBeLessThanOrEqual(ANILIST_SYNC_COOLDOWN_MS);
  });

  describe("migrate", () => {
    const migrate = useAnilistStore.persist.getOptions().migrate;

    it("migrates legacy singleton data under the anilist instance key", () => {
      const legacy = {
        defaultTab: "library",
        librarySort: "score",
        titleLanguage: "romaji",
        lastSeenActivityAt: 100,
      };

      expect(migrate?.(legacy, 1)).toEqual({
        byInstance: {
          anilist: {
            activeTab: "library",
            mediaFilter: "both",
            currentSort: "score",
            titleLanguage: "romaji",
            openBehavior: "currentTab",
            discoverFeed: "trending",
            discoverType: "anime",
            listFilter: "all",
          },
        },
        lastSeenActivityAt: 100,
      });
    });

    it("drops unrecognized legacy data", () => {
      expect(migrate?.({ activeTab: "bogus" }, 1)).toEqual({ byInstance: {} });
    });

    it("passes current-version data through unchanged", () => {
      const persisted = {
        byInstance: {
          "anilist-1": {
            activeTab: "activity",
            mediaFilter: "both",
            currentSort: "waiting",
            titleLanguage: "english",
            openBehavior: "currentTab",
          },
        },
        lastSeenActivityAt: 100,
      };
      expect(migrate?.(persisted, 5)).toBe(persisted);
    });

    it("merges the old current and planning tabs into the single list tab", () => {
      const persisted = {
        byInstance: {
          "anilist-1": { activeTab: "current", titleLanguage: "english" },
          "anilist-2": { activeTab: "planning", titleLanguage: "english" },
          "anilist-3": { activeTab: "inbox", titleLanguage: "english" },
        },
      };

      const migrated = migrate?.(persisted, 5) as typeof persisted;

      expect(migrated.byInstance["anilist-1"]?.activeTab).toBe("library");
      expect(migrated.byInstance["anilist-2"]?.activeTab).toBe("library");
      expect(migrated.byInstance["anilist-3"]?.activeTab).toBe("inbox");
    });
  });
});
