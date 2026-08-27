// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/widgets/sports/lib/espn", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/sports/lib/espn")>()),
  fetchScoreboard: vi.fn(),
  parseCachedScoreboard: () => null,
}));

import { fetchScoreboard } from "@/widgets/sports/lib/espn";
import { FavoritesTab } from "@/widgets/sports/components/FavoritesTab";
import { clearPolledResources } from "@/widgets/core/usePolledResource";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { match, seedSportsInstance, team } from "@/widgets/sports/lib/fixtures";
import { useSportsStore } from "@/widgets/sports/useSportsStore";
import { MATCH_STATES, type LeagueFollowing, type MatchState } from "@/widgets/sports/types";

const fetchMock = vi.mocked(fetchScoreboard);
const ID = "sports-fav";

function seed(
  following: Record<string, LeagueFollowing>,
  states: MatchState[] = [...MATCH_STATES],
) {
  seedSportsInstance(ID, { tab: "favorites", following, states, window: "today" });
}

function renderTab() {
  render(
    <WidgetInstanceContext.Provider value={ID}>
      <FavoritesTab />
    </WidgetInstanceContext.Provider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  clearPolledResources();
  useSportsStore.setState({ byInstance: {} });
});

describe("FavoritesTab", () => {
  it("treats a league you follow nobody in as still empty", () => {
    seed({ mlb: { teams: [] } });
    renderTab();

    expect(screen.getByText(/Follow a team to see its games here/i)).toBeInTheDocument();
  });

  it("shows only the games your teams are in, not the rest of the league", async () => {
    fetchMock.mockResolvedValue([
      match({
        id: "mine",
        away: team({ abbreviation: "NYY", name: "Yankees" }),
        home: team({ abbreviation: "BOS", name: "Red Sox" }),
      }),
      match({
        id: "other",
        away: team({ abbreviation: "SEA", name: "Mariners" }),
        home: team({ abbreviation: "TEX", name: "Rangers" }),
      }),
    ]);
    seed({ mlb: { teams: ["NYY"] } });
    renderTab();

    expect(await screen.findByText("NYY")).toBeInTheDocument();
    expect(screen.queryByText("SEA")).not.toBeInTheDocument();
  });

  it("keeps a followed team listed with No game when it is not playing", async () => {
    fetchMock.mockResolvedValue([
      match({
        id: "other",
        away: team({ abbreviation: "SEA", name: "Mariners" }),
        home: team({ abbreviation: "TEX", name: "Rangers" }),
      }),
    ]);
    seed({ mlb: { teams: ["ATL"] } });
    renderTab();

    expect(await screen.findByText("No game")).toBeInTheDocument();
    expect(screen.getByText("ATL")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /show details/i })).not.toBeInTheDocument();
  });

  it("renders one row when two followed teams play each other", async () => {
    fetchMock.mockResolvedValue([
      match({
        id: "derby",
        away: team({ abbreviation: "NYY", name: "Yankees" }),
        home: team({ abbreviation: "BOS", name: "Red Sox" }),
      }),
    ]);
    seed({ mlb: { teams: ["NYY", "BOS"] } });
    renderTab();

    expect(await screen.findAllByText("NYY")).toHaveLength(1);
    expect(screen.queryByText("No game")).not.toBeInTheDocument();
  });

  it("ignores a stored league that no longer exists", () => {
    seed({ retired: { teams: ["XYZ"] } });
    renderTab();

    expect(screen.getByText(/Follow a team to see its games here/i)).toBeInTheDocument();
  });

  it("filters followed teams by name as well as abbreviation", async () => {
    fetchMock.mockResolvedValue([
      match({
        id: "yankees",
        away: team({ abbreviation: "NYY", name: "Yankees" }),
        home: team({ abbreviation: "BOS", name: "Red Sox" }),
      }),
    ]);
    seed({ mlb: { teams: ["NYY", "ATL"] } });
    renderTab();
    await screen.findByText("NYY");

    fireEvent.change(screen.getByRole("searchbox", { name: /Filter the teams you follow/ }), {
      target: { value: "yank" },
    });

    expect(screen.getByText("NYY")).toBeInTheDocument();
    expect(screen.queryByText("ATL")).not.toBeInTheDocument();
  });

  it("honours the Show filter on the games your teams are in", async () => {
    fetchMock.mockResolvedValue([
      match({
        id: "done",
        state: "post",
        detail: "FT",
        away: team({ abbreviation: "NYY", name: "Yankees" }),
        home: team({ abbreviation: "BOS", name: "Red Sox" }),
      }),
    ]);
    seed({ mlb: { teams: ["NYY"] } }, ["in"]);
    renderTab();

    expect(await screen.findByRole("button", { name: /MLB/ })).toBeInTheDocument();
    expect(screen.queryByText("NYY")).not.toBeInTheDocument();
  });

  it("remembers a folded league, so it stays folded on the next tab", async () => {
    fetchMock.mockResolvedValue([
      match({ away: team({ abbreviation: "NYY" }), home: team({ abbreviation: "BOS" }) }),
    ]);
    seed({ mlb: { teams: ["NYY"] } });
    renderTab();

    fireEvent.click(await screen.findByRole("button", { name: /MLB/ }));

    expect(useSportsStore.getState().byInstance[ID]?.collapsed).toEqual(["mlb"]);
  });
});
