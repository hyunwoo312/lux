// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/widgets/anilist/lib/api/discover", () => ({
  fetchDiscover: vi.fn(),
  searchDiscover: vi.fn(),
}));
vi.mock("@/widgets/anilist/lib/api/list", () => ({ saveListStatus: vi.fn() }));
vi.mock("@/widgets/anilist/lib/api/cache", () => ({
  parseCachedDiscover: vi.fn().mockReturnValue(null),
}));

import { HttpError, RateLimitError } from "@/lib/net";
import { invalidatePolledResource } from "@/widgets/core/usePolledResource";
import { anilistKeys } from "@/widgets/anilist/lib/cache-keys";

import { TooltipProvider } from "@/components/ui/tooltip";
import { useIntegrationStore } from "@/integrations";
import { DiscoverView } from "@/widgets/anilist/components/DiscoverView";
import { saveListStatus } from "@/widgets/anilist/lib/api/list";
import { fetchDiscover, searchDiscover } from "@/widgets/anilist/lib/api/discover";
import { SEARCH_DEBOUNCE_MS } from "@/widgets/anilist/components/discover/useDiscoverSearch";
import { useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import type { DiscoverMedia } from "@/widgets/anilist/types";

const discoverMock = vi.mocked(fetchDiscover);
const searchMock = vi.mocked(searchDiscover);
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
  invalidatePolledResource(anilistKeys.discover("english", "trending", "anime"));
  discoverMock.mockResolvedValue([]);
  searchMock.mockResolvedValue([]);
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

  it("adds an unlisted title to Planning and marks it immediately", async () => {
    discoverMock.mockResolvedValue([media()]);
    renderView();

    fireEvent.click(await screen.findByLabelText("Add Frieren to Planning"));

    await waitFor(() => expect(saveStatusMock).toHaveBeenCalledWith(1, "PLANNING"));
    expect(await screen.findByText("Planned")).toBeInTheDocument();
    expect(screen.queryByLabelText("Add Frieren to Planning")).not.toBeInTheDocument();
  });

  it("keeps the add button outside the link so it is not nested in an anchor", async () => {
    discoverMock.mockResolvedValue([media()]);
    renderView();

    const button = await screen.findByLabelText("Add Frieren to Planning");

    expect(button.closest("a")).toBeNull();
  });

  it("tells the user when adding to Planning failed", async () => {
    discoverMock.mockResolvedValue([media()]);
    saveStatusMock.mockRejectedValue(new Error("network down"));
    renderView();

    fireEvent.click(await screen.findByLabelText("Add Frieren to Planning"));

    expect(
      await screen.findByText("Couldn’t add Frieren to Planning. Try again."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Add Frieren to Planning")).toBeEnabled();
  });

  it("reports an AniList outage as an outage rather than a generic failure", async () => {
    discoverMock.mockRejectedValue(new HttpError(503, "boom"));
    renderView();

    expect(await screen.findByText(/AniList isn’t responding/)).toBeInTheDocument();
  });
});

describe("DiscoverView list view", () => {
  beforeEach(() => {
    useAnilistStore.getState().setViewMode(ID, "list");
  });

  it("keeps the add button outside the link so it is not nested in an anchor", async () => {
    discoverMock.mockResolvedValue([media()]);
    renderView();

    const button = await screen.findByLabelText("Add Frieren to Planning");

    expect(button.closest("a")).toBeNull();
  });
});

describe("DiscoverView search", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function settle() {
    await act(async () => {
      await Promise.resolve();
    });
  }

  async function typeQuery(value: string, waitMs = SEARCH_DEBOUNCE_MS) {
    fireEvent.change(screen.getByLabelText("Search anime"), { target: { value } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(waitMs);
    });
  }

  it("collapses a burst of keystrokes into a single request", async () => {
    renderView();
    await settle();

    await typeQuery("f", 100);
    await typeQuery("fr", 100);
    await typeQuery("fri");

    expect(searchMock).toHaveBeenCalledTimes(1);
    expect(searchMock).toHaveBeenCalledWith("english", "fri", "anime", true, expect.anything());
  });

  it("searches unauthenticated when signed out", async () => {
    setConnected(false);
    renderView();
    await settle();

    await typeQuery("frieren");

    expect(searchMock).toHaveBeenCalledWith(
      "english",
      "frieren",
      "anime",
      false,
      expect.anything(),
    );
  });

  it("re-runs the search against the other media type when the toggle changes", async () => {
    renderView();
    await settle();

    await typeQuery("frieren");
    expect(searchMock).toHaveBeenCalledWith("english", "frieren", "anime", true, expect.anything());

    fireEvent.click(screen.getByRole("radio", { name: "Manga" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
    });

    expect(searchMock).toHaveBeenCalledWith("english", "frieren", "manga", true, expect.anything());
  });

  it("never lets a slow earlier search overwrite a newer one", async () => {
    let resolveFirst: (value: DiscoverMedia[]) => void = () => {};
    searchMock.mockImplementationOnce(
      () =>
        new Promise<DiscoverMedia[]>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    searchMock.mockResolvedValue([media({ id: 2, title: "Newer Result" })]);
    renderView();
    await settle();

    await typeQuery("fr");
    await typeQuery("frieren");

    expect(screen.getByText("Newer Result")).toBeInTheDocument();

    await act(async () => {
      resolveFirst([media({ id: 1, title: "Stale Result" })]);
      await Promise.resolve();
    });

    expect(screen.getByText("Newer Result")).toBeInTheDocument();
    expect(screen.queryByText("Stale Result")).not.toBeInTheDocument();
  });

  it("surfaces the wait time when AniList rate-limits the search", async () => {
    searchMock.mockRejectedValue(new RateLimitError(120_000));
    renderView();
    await settle();

    await typeQuery("frieren");

    expect(screen.getByText("Rate limited — try again in 2m.")).toBeInTheDocument();
  });

  it("reports a failed search without blaming the query", async () => {
    searchMock.mockRejectedValue(new HttpError(503, "boom"));
    renderView();
    await settle();

    await typeQuery("frieren");

    expect(screen.getByText(/AniList isn’t responding/)).toBeInTheDocument();
  });
});
