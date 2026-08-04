// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/widgets/anilist/lib/anilist-api", () => ({
  fetchDiscover: vi.fn(),
  parseCachedDiscover: vi.fn().mockReturnValue(null),
  saveListStatus: vi.fn(),
}));

import { invalidatePolledResource } from "@/widgets/core/usePolledResource";
import { anilistKeys } from "@/widgets/anilist/lib/cache-keys";

import { TooltipProvider } from "@/components/ui/tooltip";
import { useIntegrationStore } from "@/integrations";
import { DiscoverView } from "@/widgets/anilist/components/DiscoverView";
import { fetchDiscover, saveListStatus } from "@/widgets/anilist/lib/anilist-api";
import { useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import type { DiscoverMedia } from "@/widgets/anilist/types";

const discoverMock = vi.mocked(fetchDiscover);
const saveStatusMock = vi.mocked(saveListStatus);
const ID = "anilist-1";

function media(overrides: Partial<DiscoverMedia> = {}): DiscoverMedia {
  return {
    id: 1,
    kind: "anime",
    title: "Frieren",
    siteUrl: "https://anilist.co/anime/1",
    ...overrides,
  };
}

function renderView() {
  return render(
    <TooltipProvider>
      <WidgetInstanceContext.Provider value={ID}>
        <DiscoverView />
      </WidgetInstanceContext.Provider>
    </TooltipProvider>,
  );
}

function setConnected(connected: boolean) {
  useIntegrationStore.setState({
    accounts: connected
      ? [
          {
            id: "a1",
            providerId: "anilist",
            providerAccountId: "7",
            displayName: "me",
            status: "connected",
            connectedAt: "2026-06-20T00:00:00.000Z",
          },
        ]
      : [],
    loaded: true,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  // the polled-resource cache is module-level and would otherwise leak between tests
  invalidatePolledResource(anilistKeys.discover("english", "trending", "anime"));
  discoverMock.mockResolvedValue([]);
  saveStatusMock.mockResolvedValue("PLANNING");
  useAnilistStore.setState({ byInstance: {} });
  setConnected(true);
});

describe("DiscoverView", () => {
  it("requests the stored feed and type, authenticated when connected", async () => {
    renderView();

    await waitFor(() =>
      expect(discoverMock).toHaveBeenCalledWith(
        "english",
        "trending",
        "anime",
        true,
        expect.anything(),
      ),
    );
  });

  it("requests unauthenticated when signed out", async () => {
    setConnected(false);
    renderView();

    await waitFor(() =>
      expect(discoverMock).toHaveBeenCalledWith(
        "english",
        "trending",
        "anime",
        false,
        expect.anything(),
      ),
    );
  });

  it("marks titles already on your list", async () => {
    discoverMock.mockResolvedValue([media({ listStatus: "CURRENT" })]);
    renderView();

    expect(await screen.findByText("Watching")).toBeInTheDocument();
  });

  it("leaves titles not on your list unmarked", async () => {
    discoverMock.mockResolvedValue([media()]);
    renderView();

    expect(await screen.findByText("Frieren")).toBeInTheDocument();
    expect(screen.queryByText("Watching")).not.toBeInTheDocument();
  });

  it("adds an unlisted title to Planning and marks it immediately", async () => {
    discoverMock.mockResolvedValue([media()]);
    renderView();

    fireEvent.click(await screen.findByLabelText("Add Frieren to Planning"));

    await waitFor(() => expect(saveStatusMock).toHaveBeenCalledWith(1, "PLANNING"));
    expect(await screen.findByText("Planned")).toBeInTheDocument();
    expect(screen.queryByLabelText("Add Frieren to Planning")).not.toBeInTheDocument();
  });

  it("offers no add button for a title already on your list", async () => {
    discoverMock.mockResolvedValue([media({ listStatus: "COMPLETED" })]);
    renderView();

    expect(await screen.findByText("Completed")).toBeInTheDocument();
    expect(screen.queryByLabelText("Add Frieren to Planning")).not.toBeInTheDocument();
  });

  it("offers no add button when signed out", async () => {
    setConnected(false);
    discoverMock.mockResolvedValue([media()]);
    renderView();

    expect(await screen.findByText("Frieren")).toBeInTheDocument();
    expect(screen.queryByLabelText("Add Frieren to Planning")).not.toBeInTheDocument();
  });

  it("shows score, episode count and genres to judge a title by", async () => {
    discoverMock.mockResolvedValue([
      media({ averageScore: 92, episodes: 28, genres: ["Drama", "Fantasy"], format: "TV" }),
    ]);
    renderView();

    expect(await screen.findByText("92%")).toBeInTheDocument();
    expect(screen.getByText("TV — 28 ep — Drama · Fantasy")).toBeInTheDocument();
  });
});
