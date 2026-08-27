// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/widgets/sports/lib/golf", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/sports/lib/golf")>()),
  fetchLeaderboard: vi.fn(),
  parseCachedLeaderboard: () => null,
}));

import { fetchLeaderboard } from "@/widgets/sports/lib/golf";
import { FavoritesTab } from "@/widgets/sports/components/FavoritesTab";
import { SportsRefreshButton } from "@/widgets/sports/SportsRefreshButton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { clearPolledResources } from "@/widgets/core/usePolledResource";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { SPORTS_SYNC_COOLDOWN_MS, useSportsStore } from "@/widgets/sports/useSportsStore";
import { seedSportsInstance } from "@/widgets/sports/lib/fixtures";
import type { LeagueFollowing } from "@/widgets/sports/types";

const fetchMock = vi.mocked(fetchLeaderboard);
const ID = "sports-refresh";

function seed(following: Record<string, LeagueFollowing>) {
  seedSportsInstance(ID, { tab: "favorites", following, window: "today" });
}

function renderFavorites() {
  render(
    <TooltipProvider>
      <WidgetInstanceContext.Provider value={ID}>
        <SportsRefreshButton />
        <FavoritesTab />
      </WidgetInstanceContext.Provider>
    </TooltipProvider>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.clearAllMocks();
  clearPolledResources();
  useSportsStore.setState({ byInstance: {} });
});

afterEach(() => vi.useRealTimers());

describe("refreshing the Favorites tab", () => {
  it("reaches a tour you follow, which has no teams to follow", async () => {
    fetchMock.mockResolvedValue(null);
    seed({ pga: { teams: [], tour: true } });
    renderFavorites();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const button = screen.getByRole("button", { name: /refresh/i });
    expect(button).toHaveAttribute("aria-disabled", "true");

    await vi.advanceTimersByTimeAsync(SPORTS_SYNC_COOLDOWN_MS + 1000);
    const before = fetchMock.mock.calls.length;
    fireEvent.click(button);

    await waitFor(() => expect(fetchMock.mock.calls.length).toBe(before + 1));
  });
});
