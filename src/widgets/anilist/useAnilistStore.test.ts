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
    store().setActiveTab("a", "discover");
    store().setTitleLanguage("b", "romaji");

    expect(store().byInstance["a"]?.activeTab).toBe("discover");
    expect(store().byInstance["a"]?.titleLanguage).toBe("english");
    expect(store().byInstance["b"]?.titleLanguage).toBe("romaji");
    expect(store().byInstance["b"]?.activeTab).toBe("feed");
  });

  it("keeps the feed source independent per instance", () => {
    store().setFeedSource("a", "notifications");

    expect(store().byInstance["a"]?.feedSource).toBe("notifications");
    expect(store().byInstance["b"]?.feedSource).toBeUndefined();
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

  describe("merge", () => {
    const merge = useAnilistStore.persist.getOptions().merge;
    const current = () => ({ ...store(), byInstance: {}, lastSeenActivityAt: undefined });
    const mergeInto = (persisted: unknown) =>
      merge?.(persisted, current()) as ReturnType<typeof store>;

    it("moves a reader on the old activity tab to the following feed", () => {
      const merged = mergeInto({
        byInstance: { "anilist-1": { activeTab: "activity", titleLanguage: "romaji" } },
      });

      expect(merged.byInstance["anilist-1"]?.activeTab).toBe("feed");
      expect(merged.byInstance["anilist-1"]?.feedSource).toBe("following");
      expect(merged.byInstance["anilist-1"]?.titleLanguage).toBe("romaji");
    });

    it("moves a reader on the old inbox tab to the notifications feed", () => {
      const merged = mergeInto({
        byInstance: { "anilist-1": { activeTab: "inbox", titleLanguage: "english" } },
      });

      expect(merged.byInstance["anilist-1"]?.activeTab).toBe("feed");
      expect(merged.byInstance["anilist-1"]?.feedSource).toBe("notifications");
    });

    it("still folds the long-retired current and planning tabs into the library", () => {
      const merged = mergeInto({
        byInstance: {
          "anilist-1": { activeTab: "current" },
          "anilist-2": { activeTab: "planning" },
        },
      });

      expect(merged.byInstance["anilist-1"]?.activeTab).toBe("library");
      expect(merged.byInstance["anilist-2"]?.activeTab).toBe("library");
    });

    it("leaves a tab that still exists alone", () => {
      const merged = mergeInto({
        byInstance: { "anilist-1": { activeTab: "discover", discoverFeed: "top" } },
      });

      expect(merged.byInstance["anilist-1"]?.activeTab).toBe("discover");
      expect(merged.byInstance["anilist-1"]?.discoverFeed).toBe("top");
    });

    it("keeps every other setting when one field is unreadable", () => {
      const merged = mergeInto({
        byInstance: {
          "anilist-1": {
            activeTab: "library",
            currentSort: 42,
            titleLanguage: "klingon",
            openBehavior: "newTab",
            discoverType: "manga",
          },
        },
      });

      expect(merged.byInstance["anilist-1"]).toEqual({
        activeTab: "library",
        feedSource: "following",
        viewMode: "grid",
        mediaFilter: "both",
        currentSort: "score",
        listFilter: "all",
        titleLanguage: "english",
        openBehavior: "newTab",
        discoverFeed: "trending",
        discoverType: "manga",
      });
    });

    it("keeps the other instances when one of them is unreadable", () => {
      const merged = mergeInto({
        byInstance: {
          "anilist-1": { activeTab: "library", titleLanguage: "romaji" },
          "anilist-2": "not-an-object",
          "anilist-3": { activeTab: "discover" },
        },
        lastSeenActivityAt: 100,
      });

      expect(Object.keys(merged.byInstance)).toEqual(["anilist-1", "anilist-3"]);
      expect(merged.byInstance["anilist-1"]?.titleLanguage).toBe("romaji");
      expect(merged.lastSeenActivityAt).toBe(100);
    });

    it("keeps the instances when the shared last-seen marker is unreadable", () => {
      const merged = mergeInto({
        byInstance: { "anilist-1": { activeTab: "library" } },
        lastSeenActivityAt: "nope",
      });

      expect(merged.byInstance["anilist-1"]?.activeTab).toBe("library");
      expect(merged.lastSeenActivityAt).toBeUndefined();
    });

    it("starts empty rather than throwing on a blob with no instances at all", () => {
      expect(mergeInto({ lastSeenActivityAt: 100 }).byInstance).toEqual({});
      expect(mergeInto(undefined).byInstance).toEqual({});
    });
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
            feedSource: "following",
            viewMode: "grid",
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

    it("does not invent an instance out of a blob with nothing recognisable in it", () => {
      expect(migrate?.({}, 1)).toEqual({ byInstance: {} });
      expect(migrate?.({ somethingElse: 1 }, 1)).toEqual({ byInstance: {} });
      expect(migrate?.("nonsense", 1)).toEqual({ byInstance: {} });
    });

    it("keeps the readable half of a legacy blob whose tab is unrecognisable", () => {
      const migrated = migrate?.({ activeTab: "bogus", titleLanguage: "romaji" }, 1) as {
        byInstance: Record<string, { activeTab: string; titleLanguage: string }>;
      };

      expect(migrated.byInstance["anilist"]?.titleLanguage).toBe("romaji");
      expect(migrated.byInstance["anilist"]?.activeTab).toBe("feed");
    });

    it("keeps every instance of an already-instanced blob instead of collapsing it", () => {
      const migrated = migrate?.(
        {
          byInstance: {
            "anilist-1": { activeTab: "inbox", titleLanguage: "romaji" },
            "anilist-2": { activeTab: "library" },
          },
        },
        4,
      ) as { byInstance: Record<string, { activeTab: string; feedSource?: string }> };

      expect(Object.keys(migrated.byInstance)).toEqual(["anilist-1", "anilist-2"]);
      expect(migrated.byInstance["anilist-1"]?.activeTab).toBe("feed");
      expect(migrated.byInstance["anilist-1"]?.feedSource).toBe("notifications");
    });
  });
});
