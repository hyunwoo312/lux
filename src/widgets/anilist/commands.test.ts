// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/widgets/anilist/lib/api/list", () => ({ fetchList: vi.fn() }));

import { fetchList } from "@/widgets/anilist/lib/api/list";
import { clearPolledResources } from "@/widgets/core/usePolledResource";
import { POLLED_CACHE_PREFIX } from "@/lib/local-store";
import { anilistKeys } from "@/widgets/anilist/lib/cache-keys";
import { useIntegrationStore } from "@/integrations";
import { anilistCommands } from "@/widgets/anilist/commands";
import { useAnilistStore, DEFAULT_DATA } from "@/widgets/anilist/useAnilistStore";
import type { CurrentEntry } from "@/widgets/anilist/types";

function entry(id: number, title: string, over: Partial<CurrentEntry> = {}): CurrentEntry {
  return {
    id,
    kind: "anime",
    title,
    siteUrl: `https://anilist.co/anime/${id}`,
    progress: 3,
    total: 12,
    behind: null,
    ...over,
  };
}

function connect() {
  useIntegrationStore.setState({
    accounts: [
      {
        id: "anilist-1",
        providerId: "anilist",
        providerAccountId: "42",
        displayName: "Someone",
        status: "connected",
        connectedAt: "2026-08-01T00:00:00.000Z",
      },
    ],
  });
}

async function library(query: string) {
  const command = anilistCommands().find((entry) => entry.id === "anilist.library");
  if (command?.kind !== "provider") throw new Error("expected a library scope");
  return command.search(query, new AbortController().signal);
}

beforeEach(() => {
  vi.clearAllMocks();
  clearPolledResources();
  localStorage.clear();
  useIntegrationStore.setState({ accounts: [] });
  useAnilistStore.setState({ byInstance: {} });
});

describe("anilistCommands", () => {
  it("asks for the account on the commands that need it, and not on the searches", () => {
    const setupFor = (id: string) =>
      anilistCommands()
        .find((command) => command.id === id)
        ?.setup?.() ?? null;

    expect(setupFor("anilist.library")).toMatchObject({ reason: "Connect AniList" });
    expect(setupFor("anilist.search")).toBeNull();

    connect();
    expect(setupFor("anilist.library")).toBeNull();
  });

  it("groups the library by list status, in-progress first", async () => {
    connect();
    vi.mocked(fetchList).mockResolvedValue({
      scoreFormat: "POINT_10",
      entries: [
        entry(1, "Planned one", { status: "PLANNING" }),
        entry(2, "Watching one", { status: "CURRENT" }),
        entry(3, "Reading one", { kind: "manga", status: "CURRENT" }),
      ],
    });

    const found = await library("one");

    expect(found.map((result) => result.section)).toEqual(["Watching", "Reading", "Planned"]);
    expect(found[0]).toMatchObject({ label: "Watching one", meta: "Ep 3/12" });
  });

  it("reads the library straight from the cache the widget persisted", async () => {
    connect();
    localStorage.setItem(
      POLLED_CACHE_PREFIX + anilistKeys.library(42, "english"),
      JSON.stringify({
        data: { scoreFormat: "POINT_10", entries: [entry(9, "Frieren", { status: "CURRENT" })] },
        at: Date.now(),
      }),
    );

    expect(await library("frieren")).toMatchObject([{ label: "Frieren", section: "Watching" }]);
    expect(fetchList).not.toHaveBeenCalled();
  });

  it("filters what it already fetched instead of asking AniList again", async () => {
    connect();
    vi.mocked(fetchList).mockResolvedValue({
      scoreFormat: "POINT_10",
      entries: [entry(1, "Frieren"), entry(2, "Vinland Saga")],
    });

    expect(await library("")).toHaveLength(2);
    expect(await library("frieren")).toHaveLength(1);
    expect(fetchList).toHaveBeenCalledTimes(1);
  });

  it("retries after a failed lookup rather than caching the failure", async () => {
    connect();
    vi.mocked(fetchList).mockRejectedValueOnce(new Error("AniList is down"));
    await expect(library("")).rejects.toThrow("AniList is down");

    vi.mocked(fetchList).mockResolvedValue({
      scoreFormat: "POINT_10",
      entries: [entry(1, "Frieren")],
    });
    expect(await library("")).toHaveLength(1);
    expect(fetchList).toHaveBeenCalledTimes(2);
  });
});

describe("the widget's view settings", () => {
  it("never narrow what My library offers, however the widget is filtered", async () => {
    connect();
    vi.mocked(fetchList).mockResolvedValue({
      entries: [
        entry(1, "Watching now", { status: "CURRENT" }),
        entry(2, "Saved for later", { status: "PLANNING" }),
        entry(3, "Finished", { status: "COMPLETED", kind: "manga" }),
      ],
      scoreFormat: "POINT_100",
    });

    useAnilistStore.setState({
      byInstance: {
        "widget-1": { ...DEFAULT_DATA, listFilter: "progress", mediaFilter: "anime" },
      },
    });

    const rows = await library("");

    expect(rows.map((row) => row.label)).toEqual(["Watching now", "Saved for later", "Finished"]);
  });
});
