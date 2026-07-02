// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/widgets/news/lib/news", () => ({
  fetchFeed: vi.fn(),
  feedUrl: (source: string, topic: string) => `feed:${source}:${topic}`,
  searchUrl: (query: string) => `search:${query}`,
  sourceLabel: (source: string) => source,
  hasThumbnails: (source: string) => source === "nyt" || source === "bbc",
  relativeTime: () => "now",
  parseCachedNews: () => null,
}));

import { fetchFeed } from "@/widgets/news/lib/news";
import { NewsWidget } from "@/widgets/news/NewsWidget";
import { NewsHeaderActions } from "@/widgets/news/NewsHeaderActions";
import { useNewsStore } from "@/widgets/news/useNewsStore";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { NEWS_SOURCES, type NewsItem, type NewsSource, type NewsTopic } from "@/widgets/news/types";

const fetchFeedMock = vi.mocked(fetchFeed);

function item(id: string, title: string, image: string | null = null): NewsItem {
  return {
    id,
    title,
    link: `https://example.com/${id}`,
    source: "Example",
    sourceUrl: null,
    publishedAt: null,
    image,
  };
}

function seed(
  instanceId: string,
  activeSource: NewsSource,
  googleQuery = "",
  topic: NewsTopic = "top",
) {
  useNewsStore.setState({
    byInstance: {
      [instanceId]: {
        activeSource,
        topic,
        googleQuery,
        enabledSources: [...NEWS_SOURCES],
        openBehavior: "newTab",
        sortByLatest: false,
      },
    },
  });
}

function renderWidget(instanceId: string) {
  return render(
    <WidgetInstanceContext.Provider value={instanceId}>
      <NewsWidget />
    </WidgetInstanceContext.Provider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("NewsWidget", () => {
  it("renders headlines for the active source's topic feed", async () => {
    fetchFeedMock.mockResolvedValue([item("a", "First headline"), item("b", "Second headline")]);
    seed("news-rows", "bbc");
    renderWidget("news-rows");

    expect(await screen.findByText("First headline")).toBeInTheDocument();
    expect(screen.getByText("Second headline")).toBeInTheDocument();
    expect(fetchFeedMock).toHaveBeenCalledWith("feed:bbc:top", "bbc", expect.anything());
  });

  it("shows a retry affordance when the fetch fails", async () => {
    fetchFeedMock.mockRejectedValue(new Error("boom"));
    seed("news-error", "yahoo");
    renderWidget("news-error");

    expect(await screen.findByText("Couldn’t load the news.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows the search box only on the Google source and searches on submit", async () => {
    fetchFeedMock.mockResolvedValue([item("a", "Result")]);
    seed("news-search", "google");
    renderWidget("news-search");

    const input = screen.getByRole("searchbox", { name: "Search Google News" });
    fireEvent.change(input, { target: { value: "tesla" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() =>
      expect(fetchFeedMock).toHaveBeenCalledWith("search:tesla", "google", expect.anything()),
    );
  });

  it("hides the search box for non-Google sources", () => {
    fetchFeedMock.mockResolvedValue([]);
    seed("news-nyt", "nyt");
    renderWidget("news-nyt");

    expect(screen.queryByRole("searchbox", { name: "Search Google News" })).toBeNull();
  });

  it("renders a thumbnail when a headline carries an image", async () => {
    fetchFeedMock.mockResolvedValue([item("a", "Pictured story", "https://img.test/a.jpg")]);
    seed("news-thumb", "bbc", "", "world");
    const { container } = renderWidget("news-thumb");

    await screen.findByText("Pictured story");
    const img = container.querySelector('img[src="https://img.test/a.jpg"]');
    expect(img).not.toBeNull();
  });

  it("shows the publisher label only for aggregated items", async () => {
    const aggregated: NewsItem = {
      ...item("agg", "Aggregated story"),
      source: "Reuters",
      sourceUrl: "https://reuters.com",
    };
    fetchFeedMock.mockResolvedValue([aggregated, item("plain", "Plain story")]);
    seed("news-agg", "google");
    renderWidget("news-agg");

    await screen.findByText("Aggregated story");
    expect(screen.getByText("Reuters")).toBeInTheDocument();
    expect(screen.queryByText("Example")).toBeNull();
  });

  it("does not render feed thumbnails for a source without usable ones", async () => {
    fetchFeedMock.mockResolvedValue([item("a", "Yahoo story", "https://img.test/huge.jpg")]);
    seed("news-yahoo-img", "yahoo", "", "world");
    const { container } = renderWidget("news-yahoo-img");

    await screen.findByText("Yahoo story");
    expect(container.querySelector('img[src="https://img.test/huge.jpg"]')).toBeNull();
  });

  it("orders headlines by recency when sort-by-latest is on", async () => {
    const older: NewsItem = { ...item("old", "Older story"), publishedAt: 1_000 };
    const newer: NewsItem = { ...item("new", "Newer story"), publishedAt: 2_000 };
    fetchFeedMock.mockResolvedValue([older, newer]);
    useNewsStore.setState({
      byInstance: {
        "news-sort": {
          activeSource: "nyt",
          topic: "health",
          googleQuery: "",
          enabledSources: [...NEWS_SOURCES],
          openBehavior: "newTab",
          sortByLatest: true,
        },
      },
    });
    renderWidget("news-sort");

    const links = await screen.findAllByRole("link");
    expect(links[0]).toHaveTextContent("Newer story");
    expect(links[1]).toHaveTextContent("Older story");
  });

  it("does not keep a previous source's items after switching tabs", async () => {
    const delay = <T,>(value: T): Promise<T> =>
      new Promise((resolve) => setTimeout(() => resolve(value), 5));
    fetchFeedMock.mockImplementation((url: string) => {
      if (url.includes("bbc")) return delay([item("bbc-1", "BBC story")]);
      if (url.includes("nyt")) return delay([item("nyt-1", "NYT story")]);
      return delay([]);
    });
    seed("news-switch", "bbc", "", "sports");
    render(
      <TooltipProvider>
        <WidgetInstanceContext.Provider value="news-switch">
          <NewsHeaderActions />
          <NewsWidget />
        </WidgetInstanceContext.Provider>
      </TooltipProvider>,
    );
    expect(await screen.findByText("BBC story")).toBeInTheDocument();

    act(() => {
      useNewsStore.getState().setActiveSource("news-switch", "nyt");
    });
    expect(await screen.findByText("NYT story")).toBeInTheDocument();
    expect(screen.queryByText("BBC story")).toBeNull();

    act(() => {
      useNewsStore.getState().setActiveSource("news-switch", "bbc");
    });
    expect(await screen.findByText("BBC story")).toBeInTheDocument();
    expect(screen.queryByText("NYT story")).toBeNull();
  });

  it("shows a no-results message when a Google search returns nothing", async () => {
    fetchFeedMock.mockResolvedValue([]);
    seed("news-noresult", "google", "zzzqqq");
    renderWidget("news-noresult");

    expect(await screen.findByText(/No results for/)).toHaveTextContent("zzzqqq");
  });

  it("refetches when the header refresh button is clicked", async () => {
    fetchFeedMock.mockRejectedValue(new Error("boom"));
    seed("news-hdr", "bbc", "", "science");
    render(
      <TooltipProvider>
        <WidgetInstanceContext.Provider value="news-hdr">
          <NewsHeaderActions />
        </WidgetInstanceContext.Provider>
      </TooltipProvider>,
    );

    const button = await screen.findByRole("button", { name: "Refresh" });
    await waitFor(() => expect(button).not.toBeDisabled());
    const before = fetchFeedMock.mock.calls.length;
    fireEvent.click(button);
    await waitFor(() => expect(fetchFeedMock.mock.calls.length).toBeGreaterThan(before));
  });

  it("disables the header refresh during the cooldown after a successful fetch", async () => {
    fetchFeedMock.mockResolvedValue([item("a", "Headline")]);
    seed("news-cooldown", "bbc", "", "entertainment");
    render(
      <TooltipProvider>
        <WidgetInstanceContext.Provider value="news-cooldown">
          <NewsHeaderActions />
        </WidgetInstanceContext.Provider>
      </TooltipProvider>,
    );

    const button = await screen.findByRole("button", { name: "Refresh" });
    await waitFor(() => expect(button).toBeDisabled());
  });
});