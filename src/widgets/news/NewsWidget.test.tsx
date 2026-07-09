// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/widgets/news/lib/news", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/news/lib/news")>()),
  fetchFeed: vi.fn(),
  fetchSearch: vi.fn(),
  fetchMergedFeeds: vi.fn(),
  parseCachedNews: () => null,
}));

import { fetchFeed, fetchMergedFeeds, fetchSearch } from "@/widgets/news/lib/news";
import { NewsWidget } from "@/widgets/news/NewsWidget";
import { NewsHeaderActions } from "@/widgets/news/NewsHeaderActions";
import { useNewsStore } from "@/widgets/news/useNewsStore";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { NEWS_SOURCES, type NewsItem, type NewsRegion, type NewsTab } from "@/widgets/news/types";

const fetchFeedMock = vi.mocked(fetchFeed);
const fetchSearchMock = vi.mocked(fetchSearch);
const fetchMergedFeedsMock = vi.mocked(fetchMergedFeeds);

function item(id: string, title: string, image: string | null = null): NewsItem {
  return {
    id,
    title,
    link: `https://example.com/${id}`,
    source: "Example",
    sourceKey: null,
    sourceUrl: null,
    publishedAt: null,
    image,
  };
}

function seed(
  instanceId: string,
  activeSource: NewsTab,
  googleQuery = "",
  region: NewsRegion = "us",
  seenTitles: string[] = [],
) {
  useNewsStore.setState({
    byInstance: {
      [instanceId]: {
        activeSource,
        region,
        layout: "list",
        googleQuery,
        enabledSources: [...NEWS_SOURCES],
        openBehavior: "newTab",
        sortByLatest: false,
        readTitles: [],
        seenTitles,
        mutedTerms: [],
        highlightTerms: [],
      },
    },
  });
}

function renderWidget(instanceId: string) {
  return render(
    <TooltipProvider>
      <WidgetInstanceContext.Provider value={instanceId}>
        <NewsWidget />
      </WidgetInstanceContext.Provider>
    </TooltipProvider>,
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
    expect(fetchFeedMock).toHaveBeenCalledWith("bbc", "us", expect.anything());
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
    fetchSearchMock.mockResolvedValue([item("b", "Search result")]);
    seed("news-search", "google");
    renderWidget("news-search");

    const input = screen.getByRole("searchbox", { name: "Search Google News" });
    fireEvent.change(input, { target: { value: "tesla" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() =>
      expect(fetchSearchMock).toHaveBeenCalledWith("tesla", "us", expect.anything()),
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
    seed("news-thumb", "bbc", "", "uk");
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
    seed("news-agg", "google", "", "uk");
    renderWidget("news-agg");

    await screen.findByText("Aggregated story");
    expect(screen.getByText("Reuters")).toBeInTheDocument();
    expect(screen.queryByText("Example")).toBeNull();
  });

  it("does not render feed thumbnails for a source without usable ones", async () => {
    fetchFeedMock.mockResolvedValue([item("a", "NPR story", "https://img.test/huge.jpg")]);
    seed("news-npr-img", "npr");
    const { container } = renderWidget("news-npr-img");

    await screen.findByText("NPR story");
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
          region: "uk",
          layout: "list",
          googleQuery: "",
          enabledSources: [...NEWS_SOURCES],
          openBehavior: "newTab",
          sortByLatest: true,
          readTitles: [],
          seenTitles: [],
          mutedTerms: [],
          highlightTerms: [],
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
    fetchFeedMock.mockImplementation((source) => {
      if (source === "bbc") return delay([item("bbc-1", "BBC story")]);
      if (source === "nyt") return delay([item("nyt-1", "NYT story")]);
      return delay([]);
    });
    seed("news-switch", "bbc", "", "au");
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

  it("renders the merged feed with per-item sources on the All tab", async () => {
    fetchMergedFeedsMock.mockResolvedValue([{ ...item("m1", "Merged story"), source: "BBC News" }]);
    seed("news-all", "all");
    renderWidget("news-all");

    expect(await screen.findByText("Merged story")).toBeInTheDocument();
    expect(screen.getByText("BBC News")).toBeInTheDocument();
    expect(fetchMergedFeedsMock).toHaveBeenCalledWith([...NEWS_SOURCES], "us", expect.anything());
  });

  it("filters the All tab by headline or source text", async () => {
    fetchMergedFeedsMock.mockResolvedValue([
      { ...item("m1", "Rate cut announced"), source: "BBC News" },
      { ...item("m2", "Transfer window latest"), source: "The Guardian" },
    ]);
    seed("news-all-filter", "all", "", "uk");
    renderWidget("news-all-filter");

    await screen.findByText("Rate cut announced");
    const input = screen.getByRole("searchbox", { name: "Filter headlines and sources" });

    fireEvent.change(input, { target: { value: "guardian" } });
    expect(screen.queryByText("Rate cut announced")).toBeNull();
    expect(screen.getByText("Transfer window latest")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "zzz" } });
    expect(screen.getByText("No matches for “zzz”")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filter" }));
    expect(screen.getByText("Rate cut announced")).toBeInTheDocument();
  });

  it("renders tiles with a fallback panel for imageless items in tile layout", async () => {
    fetchFeedMock.mockResolvedValue([
      item("pic", "Pictured tile", "https://img.test/tile.jpg"),
      item("plain", "Plain tile"),
    ]);
    seed("news-tiles", "bbc", "", "international");
    act(() => {
      useNewsStore.getState().setLayout("news-tiles", "tiles");
    });
    const { container } = renderWidget("news-tiles");

    await screen.findByText("Pictured tile");
    expect(container.querySelector('img[src="https://img.test/tile.jpg"]')).not.toBeNull();
    expect(screen.getByText("Plain tile")).toBeInTheDocument();
  });

  it("counts unseen headlines and marks displayed titles as seen", async () => {
    fetchFeedMock.mockResolvedValue([item("s1", "Fresh one"), item("s2", "Fresh two")]);
    seed("news-seen", "nyt", "", "international", ["an older headline"]);
    renderWidget("news-seen");

    expect(await screen.findByText("2 new since your last visit")).toBeInTheDocument();
    await waitFor(() =>
      expect(useNewsStore.getState().byInstance["news-seen"]?.seenTitles).toEqual([
        "an older headline",
        "fresh one",
        "fresh two",
      ]),
    );
  });

  it("renders one new-item indicator per counted new headline in list view", async () => {
    fetchFeedMock.mockResolvedValue([
      item("k1", "Known story"),
      item("f1", "Fresh one"),
      item("f2", "Fresh two"),
    ]);
    seed("news-new-list", "guardian", "", "au", ["known story"]);
    renderWidget("news-new-list");

    expect(await screen.findByText("2 new since your last visit")).toBeInTheDocument();
    expect(screen.getAllByText("New")).toHaveLength(2);
  });

  it("renders one new-item indicator per counted new headline in tiles view", async () => {
    fetchFeedMock.mockResolvedValue([item("k1", "Known tile"), item("f1", "Fresh tile")]);
    seed("news-new-tiles", "guardian", "", "international", ["known tile"]);
    act(() => {
      useNewsStore.getState().setLayout("news-new-tiles", "tiles");
    });
    renderWidget("news-new-tiles");

    expect(await screen.findByText("1 new since your last visit")).toBeInTheDocument();
    expect(screen.getAllByText("New")).toHaveLength(1);
  });

  it("highlights configured keywords inside headlines", async () => {
    fetchFeedMock.mockResolvedValue([item("h1", "Big crypto rally today")]);
    seed("news-highlight", "npr", "", "international");
    act(() => {
      useNewsStore.getState().addHighlightTerm("news-highlight", "crypto");
    });
    renderWidget("news-highlight");

    const highlighted = await screen.findByText("crypto");
    expect(highlighted.tagName).toBe("MARK");
  });

  it("marks a headline read when it is opened", async () => {
    fetchFeedMock.mockResolvedValue([item("r1", "Readable story")]);
    seed("news-read", "guardian");
    renderWidget("news-read");

    fireEvent.click(await screen.findByText("Readable story"));
    expect(useNewsStore.getState().byInstance["news-read"]?.readTitles).toEqual(["readable story"]);
  });

  it("hides headlines matching a muted keyword", async () => {
    fetchFeedMock.mockResolvedValue([
      item("keep", "Markets steady ahead of earnings"),
      item("drop", "Celebrity gossip roundup"),
    ]);
    seed("news-mute", "guardian", "", "uk");
    act(() => {
      useNewsStore.getState().addMutedTerm("news-mute", "GOSSIP");
    });
    renderWidget("news-mute");

    expect(await screen.findByText("Markets steady ahead of earnings")).toBeInTheDocument();
    expect(screen.queryByText("Celebrity gossip roundup")).toBeNull();
  });

  it("explains when every headline is muted", async () => {
    fetchFeedMock.mockResolvedValue([item("only", "Football final tonight")]);
    seed("news-mute-all", "npr", "", "uk");
    act(() => {
      useNewsStore.getState().addMutedTerm("news-mute-all", "football");
    });
    renderWidget("news-mute-all");

    expect(
      await screen.findByText("All current headlines match your muted keywords."),
    ).toBeInTheDocument();
  });

  it("shows a no-results message when a Google search returns nothing", async () => {
    fetchSearchMock.mockResolvedValue([]);
    seed("news-noresult", "google", "zzzqqq", "au");
    renderWidget("news-noresult");

    expect(await screen.findByText(/No results for/)).toHaveTextContent("zzzqqq");
  });

  it("refetches when the header refresh button is clicked", async () => {
    fetchFeedMock.mockRejectedValue(new Error("boom"));
    seed("news-hdr", "yahoo", "", "uk");
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
    seed("news-cooldown", "yahoo", "", "international");
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
