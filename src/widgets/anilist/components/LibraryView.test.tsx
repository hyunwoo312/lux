// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/widgets/anilist/lib/api/list", () => ({
  fetchList: vi.fn(),
  saveProgress: vi.fn(),
  saveListStatus: vi.fn(),
}));
vi.mock("@/widgets/anilist/lib/api/cache", () => ({
  parseCachedCurrent: vi.fn().mockReturnValue(null),
}));
vi.mock("@/widgets/anilist/useAnilistSync", () => ({ useAnilistSync: vi.fn() }));

import { RateLimitError } from "@/lib/net";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LibraryView } from "@/widgets/anilist/components/LibraryView";
import { fetchList, saveListStatus, saveProgress } from "@/widgets/anilist/lib/api/list";
import { useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import type { CurrentEntry, CurrentSort, ListFilter, ViewMode } from "@/widgets/anilist/types";

const listMock = vi.mocked(fetchList);
const statusMock = vi.mocked(saveListStatus);
const progressMock = vi.mocked(saveProgress);
const ID = "anilist-1";
let USER = 0;

function entry(overrides: Partial<CurrentEntry> = {}): CurrentEntry {
  return {
    id: 1,
    kind: "anime",
    title: "Frieren",
    siteUrl: "https://anilist.co/anime/1",
    progress: 0,
    total: 28,
    behind: null,
    ...overrides,
  };
}

function seed(
  listFilter: ListFilter,
  currentSort: CurrentSort = "score",
  viewMode: ViewMode = "grid",
) {
  useAnilistStore.setState({
    byInstance: {
      [ID]: {
        activeTab: "library",
        feedSource: "following",
        viewMode,
        mediaFilter: "both",
        currentSort,
        titleLanguage: "english",
        openBehavior: "currentTab",
        discoverFeed: "trending",
        discoverType: "anime",
        listFilter,
      },
    },
  });
}

function renderView() {
  return render(
    <TooltipProvider>
      <WidgetInstanceContext.Provider value={ID}>
        <LibraryView enabled userId={USER} newTab={false} />
      </WidgetInstanceContext.Provider>
    </TooltipProvider>,
  );
}

const realIntersectionObserver = globalThis.IntersectionObserver;
let observed: Array<() => void> = [];

function installScrollObserver() {
  globalThis.IntersectionObserver = class {
    constructor(private readonly callback: IntersectionObserverCallback) {}
    observe() {
      observed.push(() =>
        this.callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        ),
      );
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
}

beforeEach(() => {
  vi.clearAllMocks();
  USER += 1;
  observed = [];
  installScrollObserver();
  listMock.mockResolvedValue({ entries: [entry()], scoreFormat: "POINT_100" });
  statusMock.mockResolvedValue("CURRENT");
  seed("all");
});

afterEach(() => {
  globalThis.IntersectionObserver = realIntersectionObserver;
});

describe("LibraryView", () => {
  it("fetches the whole library in one request", async () => {
    renderView();

    await waitFor(() => expect(listMock).toHaveBeenCalledWith(USER, "english", expect.anything()));
  });

  it("serves a different status filter from the same cached request", async () => {
    listMock.mockResolvedValue({
      entries: [
        entry({ id: 1, title: "Frieren", status: "CURRENT" }),
        entry({ id: 2, title: "Berserk", status: "PLANNING" }),
      ],
      scoreFormat: "POINT_100",
    });
    const first = renderView();
    await screen.findByText("Frieren");
    expect(listMock).toHaveBeenCalledTimes(1);
    first.unmount();

    seed("planned");
    renderView();

    expect(await screen.findByText("Berserk")).toBeInTheDocument();
    expect(screen.queryByText("Frieren")).not.toBeInTheDocument();
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to a valid sort when the stored one is unavailable for the status", async () => {
    listMock.mockResolvedValue({
      entries: [entry({ status: "PLANNING" })],
      scoreFormat: "POINT_100",
    });
    seed("planned", "waiting");
    renderView();

    expect(await screen.findByText("Frieren")).toBeInTheDocument();
    expect(screen.getByLabelText("Change sort order")).toBeInTheDocument();
  });

  it("writes recorded progress into the cache instead of refetching", async () => {
    progressMock.mockResolvedValue(5);
    listMock.mockResolvedValue({
      entries: [entry({ progress: 4, status: "CURRENT" })],
      scoreFormat: "POINT_100",
    });
    const view = renderView();
    await screen.findByText("Frieren");

    fireEvent.click(screen.getByLabelText("Mark next episode of Frieren"));

    await waitFor(() => expect(progressMock).toHaveBeenCalledWith(1, 5));
    expect(await screen.findByText("Ep 5/28")).toBeInTheDocument();
    view.unmount();

    renderView();

    expect(await screen.findByText("Ep 5/28")).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it.each(["grid", "list"] as const)(
    "promotes a planned title to watching from the %s layout",
    async (viewMode) => {
      listMock.mockResolvedValue({
        entries: [entry({ status: "PLANNING" })],
        scoreFormat: "POINT_100",
      });
      seed("planned", "score", viewMode);
      renderView();

      fireEvent.click(await screen.findByLabelText("Start watching Frieren"));

      await waitFor(() => expect(statusMock).toHaveBeenCalledWith(1, "CURRENT"));
      await waitFor(() => expect(screen.queryByText("Frieren")).not.toBeInTheDocument());
    },
  );

  it("says so when promoting a title fails instead of doing nothing", async () => {
    listMock.mockResolvedValue({
      entries: [entry({ status: "PLANNING" })],
      scoreFormat: "POINT_100",
    });
    statusMock.mockRejectedValue(new Error("rate limited"));
    seed("planned");
    renderView();

    fireEvent.click(await screen.findByLabelText("Start watching Frieren"));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Couldn’t move Frieren to Watching. Try again.",
      ),
    );
    expect(screen.getByText("Frieren")).toBeInTheDocument();
  });

  it("says so when recording progress fails", async () => {
    listMock.mockResolvedValue({
      entries: [entry({ status: "CURRENT", progress: 3 })],
      scoreFormat: "POINT_100",
    });
    progressMock.mockRejectedValue(new Error("rate limited"));
    renderView();

    await screen.findByText("Frieren");
    fireEvent.click(screen.getByLabelText("Mark next episode of Frieren"));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Couldn’t save your progress for Frieren. Try again.",
      ),
    );
  });

  it("says how much has been watched without relying on the abbreviated label", async () => {
    listMock.mockResolvedValue({
      entries: [entry({ progress: 7, total: 12, status: "CURRENT" })],
      scoreFormat: "POINT_100",
    });
    renderView();

    expect(await screen.findByText("7 of 12 episodes watched")).toBeInTheDocument();
  });

  it("marks an airing-soon title in words, not only in colour", async () => {
    const soon = Math.floor(Date.now() / 1000) + 3600;
    const later = Math.floor(Date.now() / 1000) + 5 * 86_400;
    listMock.mockResolvedValue({
      entries: [
        entry({ id: 1, title: "Frieren", nextEpisode: { episode: 12, airingAt: soon } }),
        entry({ id: 2, title: "Berserk", nextEpisode: { episode: 3, airingAt: later } }),
      ],
      scoreFormat: "POINT_100",
    });
    renderView();

    expect(await screen.findByText(/^Airing soon — episode 12 in/)).toBeInTheDocument();
    expect(screen.getByText(/^episode 3 in/)).toBeInTheDocument();
  });

  it("keeps the progress stepper reachable without hovering a tile", async () => {
    listMock.mockResolvedValue({
      entries: [entry({ progress: 4, status: "CURRENT" })],
      scoreFormat: "POINT_100",
    });
    renderView();

    const decrement = await screen.findByLabelText("Unmark last episode of Frieren");
    expect(screen.getByLabelText("Mark next episode of Frieren")).toBeVisible();
    expect(decrement).toBeVisible();

    fireEvent.click(decrement);

    await waitFor(() => expect(progressMock).toHaveBeenCalledWith(1, 3));
  });

  it("names the title in the stepper so identical tiles stay distinguishable", async () => {
    listMock.mockResolvedValue({
      entries: [
        entry({ id: 1, title: "Frieren", progress: 4, status: "CURRENT" }),
        entry({ id: 2, title: "Berserk", progress: 4, status: "CURRENT" }),
      ],
      scoreFormat: "POINT_100",
    });
    renderView();

    expect(await screen.findByLabelText("Mark next episode of Frieren")).toBeInTheDocument();
    expect(screen.getByLabelText("Mark next episode of Berserk")).toBeInTheDocument();
  });

  it("announces a recorded progress change", async () => {
    progressMock.mockResolvedValue(5);
    listMock.mockResolvedValue({
      entries: [entry({ progress: 4, status: "CURRENT" })],
      scoreFormat: "POINT_100",
    });
    renderView();
    await screen.findByText("Frieren");

    fireEvent.click(screen.getByLabelText("Mark next episode of Frieren"));

    await waitFor(() => expect(screen.getByRole("log")).toHaveTextContent("Frieren: Ep 5/28"));
  });

  it("repeats AniList’s own wording when a write is rate limited", async () => {
    listMock.mockResolvedValue({
      entries: [entry({ status: "CURRENT", progress: 3 })],
      scoreFormat: "POINT_100",
    });
    progressMock.mockRejectedValue(new RateLimitError(30_000));
    renderView();

    await screen.findByText("Frieren");
    fireEvent.click(screen.getByLabelText("Mark next episode of Frieren"));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Rate limited — try again in 30s."),
    );
  });

  it.each(["grid", "list"] as const)(
    "stands in with a %s skeleton while the library loads",
    async (viewMode) => {
      listMock.mockReturnValue(new Promise<never>(() => {}));
      seed("all", "score", viewMode);
      const view = renderView();

      expect(await screen.findByText("Loading your list…")).toBeInTheDocument();
      expect(
        view.container.querySelector(`[data-variant="${viewMode}"] [data-slot="skeleton"]`),
      ).not.toBeNull();
    },
  );

  it.each([
    ["grid", "https://img.anilist.co/large.jpg"],
    ["list", "https://img.anilist.co/medium.jpg"],
  ] as const)("downloads the cover sized for the %s layout", async (viewMode, expected) => {
    listMock.mockResolvedValue({
      entries: [
        entry({
          coverImage: "https://img.anilist.co/large.jpg",
          coverImageSmall: "https://img.anilist.co/medium.jpg",
        }),
      ],
      scoreFormat: "POINT_100",
    });
    seed("all", "score", viewMode);
    const view = renderView();

    await screen.findByText("Frieren");

    expect(Array.from(view.container.querySelectorAll("img"), (img) => img.src)).toEqual([
      expected,
    ]);
  });
});
