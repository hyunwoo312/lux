// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/widgets/anilist/lib/anilist-api", () => ({
  fetchList: vi.fn(),
  parseCachedCurrent: vi.fn().mockReturnValue(null),
  saveProgress: vi.fn(),
  saveListStatus: vi.fn(),
}));
vi.mock("@/widgets/anilist/useAnilistSync", () => ({ useAnilistSync: vi.fn() }));

import { TooltipProvider } from "@/components/ui/tooltip";
import { LibraryView } from "@/widgets/anilist/components/LibraryView";
import { fetchList, saveListStatus } from "@/widgets/anilist/lib/anilist-api";
import { useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import type { CurrentEntry, ListFilter } from "@/widgets/anilist/types";

const listMock = vi.mocked(fetchList);
const statusMock = vi.mocked(saveListStatus);
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

function seed(listFilter: ListFilter, currentSort: "waiting" | "score" = "score") {
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

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  USER += 1;
  listMock.mockResolvedValue({ entries: [entry()], scoreFormat: "POINT_100" });
  statusMock.mockResolvedValue("CURRENT");
  seed("all");
});

describe("LibraryView", () => {
  it("requests every status by default", async () => {
    renderView();

    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith(
        USER,
        "english",
        ["CURRENT", "REPEATING", "PLANNING", "COMPLETED", "PAUSED", "DROPPED"],
        expect.anything(),
      ),
    );
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

  it("requests only the statuses for the selected filter", async () => {
    seed("planned");
    renderView();

    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith(USER, "english", ["PLANNING"], expect.anything()),
    );
  });

  it("treats rewatching as in progress", async () => {
    seed("progress");
    renderView();

    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith(
        USER,
        "english",
        ["CURRENT", "REPEATING"],
        expect.anything(),
      ),
    );
  });

  it("falls back to a valid sort when the stored one is unavailable for the status", async () => {
    // "waiting" is only offered for in-progress; on a planned list it must not be used
    seed("planned", "waiting");
    renderView();

    expect(await screen.findByText("Frieren")).toBeInTheDocument();
    expect(screen.getByLabelText("Change sort order")).toBeInTheDocument();
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
});
