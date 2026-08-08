// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/widgets/anilist/lib/anilist-api", () => ({
  fetchList: vi.fn(),
  parseCachedCurrent: vi.fn().mockReturnValue(null),
  saveProgress: vi.fn(),
  saveListStatus: vi.fn(),
}));
vi.mock("@/widgets/anilist/useAnilistSync", () => ({ useAnilistSync: vi.fn() }));

import { TooltipProvider } from "@/components/ui/tooltip";
import { LibraryView } from "@/widgets/anilist/components/LibraryView";
import { fetchList, saveListStatus, saveProgress } from "@/widgets/anilist/lib/anilist-api";
import { useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import type { CurrentEntry, CurrentSort, ListFilter } from "@/widgets/anilist/types";

const listMock = vi.mocked(fetchList);
const statusMock = vi.mocked(saveListStatus);
const progressMock = vi.mocked(saveProgress);
const ID = "anilist-1";
// the polled-resource cache is module-level and an in-flight fetch can repopulate it after a
// reset, so each test gets its own viewer id — the cache key includes it.
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

function seed(listFilter: ListFilter, currentSort: CurrentSort = "score") {
  useAnilistStore.setState({
    byInstance: {
      [ID]: {
        activeTab: "library",
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

async function waitForEndOfListWatcher() {
  await waitFor(() => expect(observed.length).toBeGreaterThan(0));
}

function scrollToBottom() {
  if (observed.length === 0) throw new Error("nothing is watching for the end of the list");
  for (const trigger of observed) trigger();
}

function manyEntries(count: number): CurrentEntry[] {
  return Array.from({ length: count }, (_, index) =>
    entry({ id: index + 1, title: `Title ${index + 1}` }),
  );
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

  it("keeps the filter controls mounted while a new status loads", async () => {
    renderView();

    expect(screen.getByLabelText("Change status filter")).toBeInTheDocument();
    expect(screen.getByLabelText("Change sort order")).toBeInTheDocument();
  });

  it("offers the progress stepper or the promote action per row, from its own status", async () => {
    listMock.mockResolvedValue({
      entries: [
        entry({ id: 1, title: "Frieren", status: "CURRENT" }),
        entry({ id: 2, title: "Berserk", status: "PLANNING" }),
      ],
      scoreFormat: "POINT_100",
    });
    renderView();

    expect(await screen.findByLabelText("Start Berserk")).toBeInTheDocument();
    expect(screen.queryByLabelText("Start Frieren")).not.toBeInTheDocument();
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

  it("treats rewatching as in progress", async () => {
    listMock.mockResolvedValue({
      entries: [
        entry({ id: 1, title: "Frieren", status: "CURRENT" }),
        entry({ id: 2, title: "Berserk", status: "REPEATING" }),
        entry({ id: 3, title: "Vinland", status: "PLANNING" }),
      ],
      scoreFormat: "POINT_100",
    });
    seed("progress");
    renderView();

    expect(await screen.findByText("Frieren")).toBeInTheDocument();
    expect(screen.getByText("Berserk")).toBeInTheDocument();
    expect(screen.queryByText("Vinland")).not.toBeInTheDocument();
  });

  it("falls back to a valid sort when the stored one is unavailable for the status", async () => {
    // "waiting" is only offered for in-progress; on a planned list it must not be used
    listMock.mockResolvedValue({
      entries: [entry({ status: "PLANNING" })],
      scoreFormat: "POINT_100",
    });
    seed("planned", "waiting");
    renderView();

    expect(await screen.findByText("Frieren")).toBeInTheDocument();
    expect(screen.getByLabelText("Change sort order")).toBeInTheDocument();
  });

  it("renders only the first page of a long library", async () => {
    listMock.mockResolvedValue({ entries: manyEntries(45), scoreFormat: "POINT_100" });
    renderView();

    expect(await screen.findByText("Title 1")).toBeInTheDocument();
    expect(screen.getByText("Title 30")).toBeInTheDocument();
    expect(screen.queryByText("Title 31")).not.toBeInTheDocument();
  });

  it("reports how much of the library is on screen", async () => {
    listMock.mockResolvedValue({ entries: manyEntries(45), scoreFormat: "POINT_100" });
    renderView();

    expect(await screen.findByText("Showing 30 of 45")).toBeInTheDocument();
  });

  it("appends the next page when the list is scrolled to the end", async () => {
    listMock.mockResolvedValue({ entries: manyEntries(45), scoreFormat: "POINT_100" });
    renderView();
    await screen.findByText("Title 1");

    await waitForEndOfListWatcher();
    act(() => scrollToBottom());

    expect(await screen.findByText("Title 45")).toBeInTheDocument();
  });

  it("swaps the progress count for a total once everything is shown", async () => {
    listMock.mockResolvedValue({ entries: manyEntries(45), scoreFormat: "POINT_100" });
    renderView();
    await screen.findByText("Title 1");

    await waitForEndOfListWatcher();
    act(() => scrollToBottom());

    expect(await screen.findByText("45 titles")).toBeInTheDocument();
    expect(screen.queryByText(/^Showing /)).not.toBeInTheDocument();
  });

  it("does not count titles that the airing view will not render", async () => {
    listMock.mockResolvedValue({
      entries: [
        ...manyEntries(40),
        entry({ id: 99, title: "Airing", nextEpisode: { episode: 3, airingAt: 1_800_000_000 } }),
      ],
      scoreFormat: "POINT_100",
    });
    seed("all", "airing");
    renderView();

    expect(await screen.findByText("Airing")).toBeInTheDocument();
    expect(screen.queryByText(/of 41$/)).not.toBeInTheDocument();
    expect(screen.queryByText("Title 1")).not.toBeInTheDocument();
  });

  it("shows no counter for a library that fits on one page", async () => {
    listMock.mockResolvedValue({ entries: manyEntries(12), scoreFormat: "POINT_100" });
    renderView();

    await screen.findByText("Title 1");
    expect(screen.queryByText(/titles$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Showing /)).not.toBeInTheDocument();
  });

  it("writes recorded progress into the cache instead of refetching", async () => {
    progressMock.mockResolvedValue(5);
    listMock.mockResolvedValue({
      entries: [entry({ progress: 4, status: "CURRENT" })],
      scoreFormat: "POINT_100",
    });
    const view = renderView();
    await screen.findByText("Frieren");

    fireEvent.click(screen.getByLabelText("Mark next episode"));

    await waitFor(() => expect(progressMock).toHaveBeenCalledWith(1, 5));
    expect(await screen.findByText("Ep 5/28")).toBeInTheDocument();
    view.unmount();

    renderView();

    expect(await screen.findByText("Ep 5/28")).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it("promotes a planned title to watching", async () => {
    listMock.mockResolvedValue({
      entries: [entry({ status: "PLANNING" })],
      scoreFormat: "POINT_100",
    });
    seed("planned");
    renderView();

    fireEvent.click(await screen.findByLabelText("Start Frieren"));

    await waitFor(() => expect(statusMock).toHaveBeenCalledWith(1, "CURRENT"));
    await waitFor(() => expect(screen.queryByText("Frieren")).not.toBeInTheDocument());
  });

  it("says so when promoting a title fails instead of doing nothing", async () => {
    listMock.mockResolvedValue({
      entries: [entry({ status: "PLANNING" })],
      scoreFormat: "POINT_100",
    });
    statusMock.mockRejectedValue(new Error("rate limited"));
    seed("planned");
    renderView();

    fireEvent.click(await screen.findByLabelText("Start Frieren"));

    expect(await screen.findByRole("status")).toHaveTextContent("Couldn’t update your list.");
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
    fireEvent.click(screen.getByLabelText("Mark next episode"));

    expect(await screen.findByRole("status")).toHaveTextContent("Couldn’t update your list.");
  });
});
