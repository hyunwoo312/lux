import { beforeEach, describe, expect, it } from "vitest";
import { GITHUB_SYNC_COOLDOWN_MS, useGithubStore } from "@/widgets/github/useGithubStore";

const store = () => useGithubStore.getState();

beforeEach(() => {
  useGithubStore.setState({
    byInstance: {},
    contributions: undefined,
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
      const contributions = {
        weeks: [[{ date: "2026-06-01", count: 2, level: 1 }]],
        total: 2,
        currentStreak: 1,
        longestStreak: 3,
      };
      const legacy = { view: "inbox", showPrivate: false, openBehavior: "newTab", contributions };

      expect(migrate?.(legacy, 1)).toEqual({
        byInstance: { github: { view: "inbox", showPrivate: false, openBehavior: "newTab" } },
        contributions,
      });
    });

    it("drops unrecognized legacy data", () => {
      expect(migrate?.({ view: "bogus" }, 1)).toEqual({ byInstance: {} });
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
});
