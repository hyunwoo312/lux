import { beforeEach, describe, expect, it } from "vitest";
import { GITHUB_SYNC_COOLDOWN_MS, useGithubStore } from "@/widgets/github/useGithubStore";

const store = () => useGithubStore.getState();

beforeEach(() => {
  useGithubStore.setState({
    byInstance: {},
    login: undefined,
    syncNonce: 0,
    syncing: false,
    lastSyncAt: undefined,
  });
});

describe("useGithubStore", () => {
  it("keeps view settings independent per instance", () => {
    store().setView("a", "inbox");
    store().setShowPrivate("b", false);

    expect(store().byInstance["a"]?.view).toBe("inbox");
    expect(store().byInstance["a"]?.showPrivate).toBe(true);
    expect(store().byInstance["b"]?.view).toBe("contributions");
    expect(store().byInstance["b"]?.showPrivate).toBe(false);
  });

  it("drops an instance's view settings on cleanup", () => {
    store().setView("a", "inbox");
    store().removeInstance("a");
    expect(store().byInstance["a"]).toBeUndefined();
  });

  it("shares sync state across instances and honors the cooldown", () => {
    const first = store().requestSync();
    expect(first).toEqual({ ok: true, remainingMs: 0 });
    expect(store().syncNonce).toBe(1);

    const second = store().requestSync();
    expect(second.ok).toBe(false);
    expect(second.remainingMs).toBeGreaterThan(0);
    expect(second.remainingMs).toBeLessThanOrEqual(GITHUB_SYNC_COOLDOWN_MS);
  });

  describe("migrate", () => {
    const migrate = useGithubStore.persist.getOptions().migrate;

    it("migrates legacy singleton data under the github instance key", () => {
      const legacy = {
        view: "inbox",
        showPrivate: false,
        openBehavior: "newTab",
        contributions: { weeks: [], total: 2, currentStreak: 1, longestStreak: 3 },
      };

      expect(migrate?.(legacy, 1)).toEqual({
        byInstance: {
          github: {
            view: "inbox",
            showPrivate: false,
            showDrafts: true,
            inboxFilter: "all",
            collapsedRepos: [],
            openBehavior: "newTab",
          },
        },
      });
    });

    it("keeps a legacy widget whose one unreadable field falls back to its default", () => {
      const migrated = migrate?.({ view: "bogus", showPrivate: false }, 1) as {
        byInstance: Record<string, { view: string; showPrivate: boolean }>;
      };
      expect(migrated.byInstance["github"]?.view).toBe("contributions");
      expect(migrated.byInstance["github"]?.showPrivate).toBe(false);
    });

    it("does not invent an instance out of a blob with nothing recognisable in it", () => {
      expect(migrate?.({}, 1)).toEqual({ byInstance: {} });
      expect(migrate?.({ somethingElse: 1 }, 1)).toEqual({ byInstance: {} });
      expect(migrate?.("nonsense", 1)).toEqual({ byInstance: {} });
    });

    it("passes current-version data through unchanged", () => {
      const persisted = {
        byInstance: {
          "github-1": { view: "contributions", showPrivate: true, openBehavior: "currentTab" },
        },
      };
      expect(migrate?.(persisted, 2)).toBe(persisted);
    });
  });

  it("collapses and re-expands a repository section independently per instance", () => {
    store().toggleRepoCollapsed("a", "o/one");
    store().toggleRepoCollapsed("a", "o/two");
    expect(store().byInstance["a"]?.collapsedRepos).toEqual(["o/one", "o/two"]);

    store().toggleRepoCollapsed("a", "o/one");
    expect(store().byInstance["a"]?.collapsedRepos).toEqual(["o/two"]);
    expect(store().byInstance["b"]?.collapsedRepos).toBeUndefined();
  });

  describe("merge", () => {
    const merge = useGithubStore.persist.getOptions().merge;
    const mergeInto = (persisted: unknown) =>
      merge?.(persisted, {
        ...useGithubStore.getState(),
        byInstance: {},
        login: undefined,
      }) as ReturnType<typeof useGithubStore.getState>;

    const valid = { view: "inbox", showPrivate: false, openBehavior: "newTab" };

    it("keeps the readable instances when one of them is unreadable", () => {
      const merged = mergeInto({ byInstance: { a: valid, b: "junk", c: valid } });
      expect(Object.keys(merged.byInstance)).toEqual(["a", "c"]);
    });

    it("keeps every other setting when one field is unreadable", () => {
      const merged = mergeInto({ byInstance: { a: { ...valid, view: "nonsense" } } });
      expect(merged.byInstance["a"]?.view).toBe("contributions");
      expect(merged.byInstance["a"]?.showPrivate).toBe(false);
      expect(merged.byInstance["a"]?.openBehavior).toBe("newTab");
    });

    it("starts empty rather than throwing on a blob with no instances at all", () => {
      expect(mergeInto({}).byInstance).toEqual({});
      expect(mergeInto({ byInstance: null }).byInstance).toEqual({});
      expect(mergeInto({ byInstance: [] }).byInstance).toEqual({});
      expect(mergeInto(undefined).byInstance).toEqual({});
    });

    it("gives a widget saved before these settings existed their defaults", () => {
      const merged = mergeInto({
        byInstance: { a: { view: "inbox", showPrivate: false, openBehavior: "newTab" } },
      });

      expect(merged.byInstance["a"]?.view).toBe("inbox");
      expect(merged.byInstance["a"]?.showDrafts).toBe(true);
      expect(merged.byInstance["a"]?.inboxFilter).toBe("all");
      expect(merged.byInstance["a"]?.collapsedRepos).toEqual([]);
    });

    it("keeps the readable collapsed repositories and drops the rest", () => {
      const merged = mergeInto({
        byInstance: { a: { ...valid, collapsedRepos: ["o/one", 42, "o/two"] } },
      });

      expect(merged.byInstance["a"]?.collapsedRepos).toEqual(["o/one", "o/two"]);
    });

    it("falls back to showing everything when the saved filter is unreadable", () => {
      const merged = mergeInto({ byInstance: { a: { ...valid, inboxFilter: "nonsense" } } });
      expect(merged.byInstance["a"]?.inboxFilter).toBe("all");
    });

    it("remembers the newest release you have seen", () => {
      const at = "2026-08-20T00:00:00.000Z";
      expect(mergeInto({ byInstance: { a: valid }, lastSeenReleaseAt: at }).lastSeenReleaseAt).toBe(
        at,
      );
      expect(
        mergeInto({ byInstance: { a: valid }, lastSeenReleaseAt: 5 }).lastSeenReleaseAt,
      ).toBeUndefined();
    });

    it("carries the login across a reload so the profile link survives", () => {
      expect(mergeInto({ byInstance: { a: valid }, login: "octocat" }).login).toBe("octocat");
      expect(mergeInto({ byInstance: { a: valid }, login: 42 }).login).toBeUndefined();
    });

    it("ignores a retired contributions cache without losing the settings", () => {
      const merged = mergeInto({ byInstance: { a: valid }, contributions: "whatever" });
      expect(merged.byInstance["a"]?.view).toBe("inbox");
    });
  });
});
