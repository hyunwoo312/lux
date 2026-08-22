// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/widgets/news/lib/news", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/news/lib/news")>()),
  fetchFeed: vi.fn().mockResolvedValue([]),
  fetchSearch: vi.fn().mockResolvedValue([]),
  fetchMergedFeeds: vi.fn().mockResolvedValue([]),
  parseCachedNews: () => null,
}));
vi.mock("@/widgets/news/lib/trending", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/news/lib/trending")>()),
  fetchTrends: vi.fn(),
  parseCachedTrends: () => null,
}));

import { fetchTrends } from "@/widgets/news/lib/trending";
import { clearPolledResources } from "@/widgets/core/usePolledResource";
import { NewsWidget } from "@/widgets/news/NewsWidget";
import { useNewsStore } from "@/widgets/news/useNewsStore";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { NEWS_SOURCES, type TrendItem, type TrendsFeed } from "@/widgets/news/types";
import { TREND_REGIONS } from "@/widgets/news/lib/trend-regions";

const fetchTrendsMock = vi.mocked(fetchTrends);
const ID = "news-trending";

function trend(term: string, withNews = true): TrendItem {
  return {
    term,
    trafficLabel: "20K+",
    traffic: 20_000,
    startedAt: 1,
    imageUrl: `https://img.test/${term}.jpg`,
    imageSource: "Somewhere",
    news: withNews
      ? [
          {
            title: `Why ${term} is everywhere`,
            url: `https://news.test/${term}`,
            source: "The Wire",
            imageUrl: null,
          },
        ]
      : [],
  };
}

function feed(items: TrendItem[]): TrendsFeed {
  return { region: "US", items };
}

function seed(overrides: Record<string, unknown> = {}, trendSnapshots = {}) {
  useNewsStore.setState({
    byInstance: {
      [ID]: {
        view: "trending",
        trendRegion: "US",
        activeSource: "all",
        region: "us",
        topic: "top",
        layout: "list",
        googleQuery: "",
        enabledSources: [...NEWS_SOURCES],
        openBehavior: "newTab",
        loadImages: true,
        sortByLatest: false,
        readTitles: [],
        seenTitles: [],
        mutedTerms: [],
        highlightTerms: [],
        bookmarks: [],
        ...overrides,
      } as never,
    },
    trendSnapshots,
  });
}

function renderWidget() {
  return render(
    <TooltipProvider>
      <WidgetInstanceContext.Provider value={ID}>
        <NewsWidget />
      </WidgetInstanceContext.Provider>
    </TooltipProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  clearPolledResources();
  seed();
  fetchTrendsMock.mockResolvedValue(feed([trend("aurora"), trend("eclipse")]));
});

describe("the Trending tab", () => {
  it("searches the engine the user already chose, where the widget is set to open it", async () => {
    renderWidget();
    await screen.findByText("aurora");

    fireEvent.click(screen.getByRole("button", { name: /aurora/ }));

    expect(globalThis.chrome.search.query).toHaveBeenCalledWith({
      text: "aurora",
      disposition: "NEW_TAB",
    });
  });

  it("offers the region alphabetically, with the United States first", () => {
    expect(TREND_REGIONS[0]?.label).toBe("United States");
    const rest = TREND_REGIONS.slice(1).map((entry) => entry.label);
    expect(rest).toEqual([...rest].sort());
  });

  it("says nothing about movement until it has a ranking to compare with", async () => {
    renderWidget();
    await screen.findByText("aurora");
    expect(screen.queryByText("New")).not.toBeInTheDocument();
  });

  it("marks a term that was not in the last ranking as new", async () => {
    seed({}, { US: { takenAt: 1, ranks: { eclipse: 1 }, previous: {} } });
    renderWidget();
    await screen.findByText("aurora");
    await waitFor(() => expect(screen.getByText("New")).toBeInTheDocument());
  });

  it("remembers this ranking so the next refresh can be compared with it", async () => {
    renderWidget();
    await screen.findByText("aurora");
    await waitFor(() =>
      expect(useNewsStore.getState().trendSnapshots.US?.ranks).toEqual({
        aurora: 1,
        eclipse: 2,
      }),
    );
  });

  it("does not fetch trends at all while the News tab is showing", async () => {
    seed({ view: "news" });
    renderWidget();
    await waitFor(() => expect(screen.queryByText("aurora")).not.toBeInTheDocument());
    expect(fetchTrendsMock).not.toHaveBeenCalled();
  });
});
