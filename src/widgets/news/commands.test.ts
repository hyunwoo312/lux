// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/widgets/news/lib/news", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/news/lib/news")>()),
  fetchMergedFeeds: vi.fn(),
  fetchSearch: vi.fn(),
}));

import { fetchMergedFeeds } from "@/widgets/news/lib/news";
import { clearPolledResources } from "@/widgets/core/usePolledResource";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { newsCommands } from "@/widgets/news/commands";
import { useNewsStore } from "@/widgets/news/useNewsStore";
import type { NewsItem } from "@/widgets/news/types";

function story(id: string, title: string): NewsItem {
  return {
    id,
    title,
    link: `https://example.com/${id}`,
    source: "BBC",
    sourceKey: "bbc",
    sourceUrl: null,
    publishedAt: null,
    image: null,
    dek: null,
    related: [],
  };
}

function place(...ids: string[]) {
  useDashboardStore.setState({ widgets: ids.map((id) => ({ id, type: "news" as const })) });
}

async function run(id: string, query: string) {
  const command = newsCommands().find((entry) => entry.id === id);
  if (command?.kind !== "provider") throw new Error(`expected a ${id} scope`);
  return command.search(query, new AbortController().signal);
}

beforeEach(() => {
  vi.clearAllMocks();
  clearPolledResources();
  localStorage.clear();
  place();
  useNewsStore.setState({ byInstance: {} });
});

describe("newsCommands", () => {
  it("reads headlines with no News widget placed", async () => {
    vi.mocked(fetchMergedFeeds).mockResolvedValue({
      items: [story("a", "Something happened")],
      missing: [],
    });

    const bookmarks = newsCommands().find((command) => command.id === "news.bookmarks");
    expect(bookmarks?.setup?.()).toMatchObject({ reason: "Add the News widget" });
    expect(await run("news.headlines", "")).toMatchObject([{ label: "Something happened" }]);
  });

  it("merges saved stories across widgets, newest first and listed once", async () => {
    place("n1", "n2");
    const { toggleBookmark } = useNewsStore.getState();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00Z"));
    toggleBookmark("n1", story("a", "Shared"));
    vi.setSystemTime(new Date("2026-08-02T00:00:00Z"));
    toggleBookmark("n2", story("b", "Solo"));
    vi.setSystemTime(new Date("2026-08-03T00:00:00Z"));
    toggleBookmark("n2", story("a", "Shared"));
    vi.useRealTimers();

    const rows = await run("news.bookmarks", "");

    expect(rows.map((row) => row.label)).toEqual(["Shared", "Solo"]);
  });
});
