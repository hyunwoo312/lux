// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

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
    dek: null,
    related: [],
  };
}

const feed = (items: NewsItem[]) => ({ items, missing: [] });

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
        view: "news",
        trendRegion: "US",
        activeSource,
        region,
        topic: "top",
        layout: "list",
        googleQuery,
        enabledSources: [...NEWS_SOURCES],
        openBehavior: "newTab",
        loadImages: true,
        sortByLatest: false,
        readTitles: [],
        seenTitles,
        mutedTerms: [],
        highlightTerms: [],
        bookmarks: [],
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
  vi.clearAllMocks();
});

describe("NewsWidget", () => {
  it("shows a retry affordance when the fetch fails", async () => {
    fetchFeedMock.mockRejectedValue(new Error("boom"));
    seed("news-error", "yahoo");
    renderWidget("news-error");

    expect(await screen.findByText("Couldn’t load the news.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows the search box only on the Google source and searches on submit", async () => {
    fetchFeedMock.mockResolvedValue(feed([item("a", "Result")]));
    fetchSearchMock.mockResolvedValue(feed([item("b", "Search result")]));
    seed("news-search", "google");
    renderWidget("news-search");

    const input = screen.getByRole("searchbox", { name: "Search Google News" });
    fireEvent.change(input, { target: { value: "tesla" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() =>
      expect(fetchSearchMock).toHaveBeenCalledWith("tesla", "us", expect.anything()),
    );
  });

  it("orders headlines by recency when sort-by-latest is on", async () => {
    const older: NewsItem = { ...item("old", "Older story"), publishedAt: 1_000 };
    const newer: NewsItem = { ...item("new", "Newer story"), publishedAt: 2_000 };
    fetchFeedMock.mockResolvedValue(feed([older, newer]));
    useNewsStore.setState({
      byInstance: {
        "news-sort": {
          view: "news",
          trendRegion: "US",
          activeSource: "nyt",
          region: "uk",
          topic: "top",
          layout: "list",
          googleQuery: "",
          enabledSources: [...NEWS_SOURCES],
          openBehavior: "newTab",
          loadImages: true,
          sortByLatest: true,
          readTitles: [],
          seenTitles: [],
          mutedTerms: [],
          highlightTerms: [],
          bookmarks: [],
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
      if (source === "bbc") return delay(feed([item("bbc-1", "BBC story")]));
      if (source === "nyt") return delay(feed([item("nyt-1", "NYT story")]));
      return delay(feed([]));
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

  it("filters the All tab by headline or source text", async () => {
    fetchMergedFeedsMock.mockResolvedValue(
      feed([
        { ...item("m1", "Rate cut announced"), source: "BBC News" },
        { ...item("m2", "Transfer window latest"), source: "The Guardian" },
      ]),
    );
    seed("news-all-filter", "all", "", "uk");
    renderWidget("news-all-filter");

    await screen.findByText("Rate cut announced");
    const input = screen.getByRole("searchbox", { name: "Filter headlines and sources" });

    fireEvent.change(input, { target: { value: "guardian" } });
    expect(screen.queryByText("Rate cut announced")).toBeNull();
    expect(screen.getByText("Transfer window latest")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "zzz" } });
    expect(screen.getByText("No matches for “zzz”")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByText("Rate cut announced")).toBeInTheDocument();
  });

  it("counts unseen headlines and marks displayed titles as seen", async () => {
    fetchFeedMock.mockResolvedValue(feed([item("s1", "Fresh one"), item("s2", "Fresh two")]));
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

  it("previews without marking read or fetching, then marks read on publisher open", async () => {
    fetchFeedMock.mockResolvedValue(feed([item("r1", "Readable story")]));
    seed("news-read", "guardian");
    renderWidget("news-read");

    fireEvent.click(await screen.findByText("Readable story"));
    expect(screen.getByRole("region", { name: "Story preview" })).toBeInTheDocument();
    expect(useNewsStore.getState().byInstance["news-read"]?.readTitles).toEqual([]);
    expect(fetchFeedMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("link", { name: "Open" }));
    expect(useNewsStore.getState().byInstance["news-read"]?.readTitles).toEqual(["readable story"]);
  });

  it("hides headlines matching a muted keyword", async () => {
    fetchFeedMock.mockResolvedValue(
      feed([
        item("keep", "Markets steady ahead of earnings"),
        item("drop", "Celebrity gossip roundup"),
      ]),
    );
    seed("news-mute", "guardian", "", "uk");
    act(() => {
      useNewsStore.getState().addMutedTerm("news-mute", "GOSSIP");
    });
    renderWidget("news-mute");

    expect(await screen.findByText("Markets steady ahead of earnings")).toBeInTheDocument();
    expect(screen.queryByText("Celebrity gossip roundup")).toBeNull();
  });

  it("explains when every headline is muted", async () => {
    fetchFeedMock.mockResolvedValue(feed([item("only", "Football final tonight")]));
    seed("news-mute-all", "npr", "", "uk");
    act(() => {
      useNewsStore.getState().addMutedTerm("news-mute-all", "football");
    });
    renderWidget("news-mute-all");

    expect(
      await screen.findByText("All current headlines match your muted keywords."),
    ).toBeInTheDocument();
  });

  it("disables the header refresh during the cooldown after a successful fetch", async () => {
    fetchFeedMock.mockResolvedValue(feed([item("a", "Headline")]));
    seed("news-cooldown", "yahoo", "", "international");
    render(
      <TooltipProvider>
        <WidgetInstanceContext.Provider value="news-cooldown">
          <NewsHeaderActions />
        </WidgetInstanceContext.Provider>
      </TooltipProvider>,
    );

    const button = await screen.findByRole("button", { name: "Refresh" });
    await waitFor(() => expect(button).toHaveAttribute("aria-disabled", "true"));
  });
});

describe("news image loading", () => {
  it("requests no publisher images when loading is turned off", async () => {
    fetchFeedMock.mockResolvedValue(feed([item("p", "Pictured", "https://img.test/a.jpg")]));
    seed("news-img-off", "bbc", "", "international");
    act(() => {
      useNewsStore.getState().setLoadImages("news-img-off", false);
    });
    const { container } = renderWidget("news-img-off");

    await screen.findByText("Pictured");
    expect(container.querySelector('img[src="https://img.test/a.jpg"]')).toBeNull();
  });
});

describe("remote images carry a no-referrer policy", () => {
  it("does not leak the extension origin to publishers", async () => {
    fetchFeedMock.mockResolvedValue(feed([item("p", "Pictured", "https://img.test/a.jpg")]));
    seed("news-referrer", "bbc", "", "international");
    const { container } = renderWidget("news-referrer");

    await screen.findByText("Pictured");
    const image = container.querySelector('img[src="https://img.test/a.jpg"]');
    expect(image?.getAttribute("referrerpolicy")).toBe("no-referrer");
  });
});

describe("saved headlines", () => {
  it("saves a headline from its bookmark and shows it in the saved view", async () => {
    fetchFeedMock.mockResolvedValue(feed([item("a", "First headline")]));
    seed("news-saved-2", "bbc");
    renderWidget("news-saved-2");

    fireEvent.click(await screen.findByRole("button", { name: /save “First headline”/i }));
    expect(useNewsStore.getState().byInstance["news-saved-2"]?.bookmarks).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /saved headlines/i }));
    expect(screen.getByRole("list", { name: "Saved headlines" })).toBeInTheDocument();
    expect(screen.getByText("First headline")).toBeInTheDocument();
  });

  it("removes a headline from the saved view", async () => {
    fetchFeedMock.mockResolvedValue(feed([item("a", "First headline")]));
    seed("news-saved-4", "bbc");
    renderWidget("news-saved-4");

    fireEvent.click(await screen.findByRole("button", { name: /save “First headline”/i }));
    fireEvent.click(screen.getByRole("button", { name: /saved headlines/i }));
    fireEvent.click(screen.getByRole("button", { name: /remove “First headline”/i }));

    expect(useNewsStore.getState().byInstance["news-saved-4"]?.bookmarks).toHaveLength(0);
  });
});

describe("reader state regressions", () => {
  it("shows Google search for a resolved single Google source with a stored All tab", async () => {
    fetchFeedMock.mockResolvedValue(feed([item("g", "Google headline")]));
    seed("news-single-google", "all");
    useNewsStore.getState().setEnabledSources("news-single-google", ["google"]);
    renderWidget("news-single-google");

    await screen.findByText("Google headline");
    expect(screen.getByRole("searchbox", { name: "Search Google News" })).toBeInTheDocument();
    expect(screen.queryByRole("searchbox", { name: "Filter headlines and sources" })).toBeNull();
  });

  it("never renders saved publisher images with image loading disabled", async () => {
    const saved = item("a", "Saved picture", "https://img.test/saved.jpg");
    fetchFeedMock.mockResolvedValue(feed([saved]));
    seed("news-saved-images", "bbc");
    useNewsStore.getState().toggleBookmark("news-saved-images", saved);
    useNewsStore.getState().setLoadImages("news-saved-images", false);
    const { container } = renderWidget("news-saved-images");

    await screen.findByText("Saved picture");
    fireEvent.click(screen.getByRole("button", { name: /saved headlines/i }));
    expect(container.querySelector('img[src="https://img.test/saved.jpg"]')).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Saved picture" }));
    expect(container.querySelector('img[src="https://img.test/saved.jpg"]')).toBeNull();
  });

  it("keeps the last saved story preview after unsaving, then returns to the empty saved list", async () => {
    const saved = item("a", "Last saved story");
    fetchFeedMock.mockResolvedValue(feed([saved]));
    seed("news-saved-preview", "bbc");
    useNewsStore.getState().toggleBookmark("news-saved-preview", saved);
    renderWidget("news-saved-preview");

    await screen.findByText(saved.title);
    fireEvent.click(screen.getByRole("button", { name: /saved headlines/i }));
    fireEvent.click(screen.getByRole("link", { name: saved.title }));
    fireEvent.click(screen.getByRole("button", { name: "Saved" }));
    const preview = screen.getByRole("region", { name: "Story preview" });
    expect(within(preview).getByRole("heading", { name: saved.title })).toBeInTheDocument();
    expect(within(preview).getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(useNewsStore.getState().byInstance["news-saved-preview"]?.bookmarks).toEqual([]);

    fireEvent.click(within(preview).getByRole("button", { name: "Headlines" }));
    const empty = screen.getByText(/Nothing saved yet/);
    await waitFor(() => expect(empty.closest('[tabindex="-1"]')).toHaveFocus());
  });

  it("keeps a read story preview when it is the only unread item and returns focus to the empty reader", async () => {
    fetchFeedMock.mockResolvedValue(feed([item("a", "Only unread story")]));
    seed("news-unread-preview", "bbc");
    renderWidget("news-unread-preview");

    await screen.findByText("Only unread story");
    fireEvent.click(screen.getByRole("button", { name: "Unread" }));
    fireEvent.click(screen.getByRole("link", { name: "Only unread story" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark read" }));
    const preview = screen.getByRole("region", { name: "Story preview" });
    expect(within(preview).getByRole("heading", { name: "Only unread story" })).toBeInTheDocument();
    expect(within(preview).getByRole("button", { name: "Mark unread" })).toBeInTheDocument();
    fireEvent.keyDown(within(preview).getByRole("button", { name: "Headlines" }), {
      key: "Escape",
    });
    const empty = screen.getByText(/No unread headlines here/);
    await waitFor(() => expect(empty.closest('[tabindex="-1"]')).toHaveFocus());
  });

  it("moves focus to a remaining headline when M removes the focused unread row", async () => {
    fetchFeedMock.mockResolvedValue(feed([item("a", "First unread"), item("b", "Next unread")]));
    seed("news-unread-focus", "bbc");
    renderWidget("news-unread-focus");

    await screen.findByText("First unread");
    fireEvent.click(screen.getByRole("button", { name: "Unread" }));
    const first = screen.getByRole("link", { name: "First unread" });
    first.focus();
    fireEvent.keyDown(first, { key: "m" });
    await waitFor(() => expect(screen.getByRole("link", { name: "Next unread" })).toHaveFocus());
    expect(screen.queryByRole("link", { name: "First unread" })).toBeNull();
    expect(useNewsStore.getState().byInstance["news-unread-focus"]?.readTitles).toEqual([
      "first unread",
    ]);
  });
});
