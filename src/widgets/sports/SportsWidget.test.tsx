// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("@/widgets/sports/lib/espn", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/sports/lib/espn")>()),
  fetchScoreboard: vi.fn(),
  parseCachedScoreboard: () => null,
}));

import { fetchScoreboard } from "@/widgets/sports/lib/espn";
import { SportsWidget } from "@/widgets/sports/SportsWidget";
import { useSportsStore } from "@/widgets/sports/useSportsStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { clearPolledResources } from "@/widgets/core/usePolledResource";
import { match, seedSportsInstance, team } from "@/widgets/sports/lib/fixtures";

const fetchMock = vi.mocked(fetchScoreboard);

function renderWidget(instanceId: string, leagueId: string, teams: string[] = []) {
  seedSportsInstance(instanceId, {
    leagueId,
    following: { [leagueId]: { teams } },
    window: "today",
  });
  render(
    <WidgetInstanceContext.Provider value={instanceId}>
      <SportsWidget />
    </WidgetInstanceContext.Provider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  clearPolledResources();
  useSportsStore.setState({ byInstance: {} });
});

describe("SportsWidget", () => {
  it("keeps the detail hidden until the row is opened", async () => {
    fetchMock.mockResolvedValue([
      match({
        id: "detail",
        venue: "Yankee Stadium",
        broadcast: "MLB.TV",
        link: "https://espn.com/game/1",
        situation: { balls: 0, strikes: 2, outs: 2, bases: [2] },
      }),
    ]);
    renderWidget("sports-detail", "nhl");

    const row = await screen.findByRole("button", { name: /show details/i });
    expect(row).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Yankee Stadium · MLB.TV")).not.toBeInTheDocument();

    fireEvent.click(row);

    expect(row).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("0-2, 2 out, runner on 2nd")).toBeInTheDocument();
    expect(screen.getByText("Yankee Stadium · MLB.TV")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /espn/i })).toBeInTheDocument();
  });

  it("offers a wider range when today happens to be empty", async () => {
    fetchMock.mockResolvedValue([]);
    renderWidget("sports-widen", "nfl");

    fireEvent.click(await screen.findByRole("button", { name: /either side of today/i }));

    expect(useSportsStore.getState().byInstance["sports-widen"]?.window).toBe("week");
  });

  it("degrades to a readable message when the scoreboard fails", async () => {
    fetchMock.mockRejectedValue(new Error("boom"));
    renderWidget("sports-error", "nhl");

    expect(await screen.findByText("Couldn’t load scores.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("warns that live detail is unconfirmed for a league we could not verify", async () => {
    fetchMock.mockResolvedValue([match()]);
    renderWidget("sports-unverified", "nhl");

    expect(await screen.findByRole("note")).toHaveTextContent(/NHL live detail is unconfirmed/);
  });

  it("does not offer to expand a fixture that has nothing to show", async () => {
    fetchMock.mockResolvedValue([
      match({
        id: "bare",
        state: "pre",
        detail: "7:30 PM",
        away: team({ abbreviation: "MTL", name: "Canadiens", score: null }),
        home: team({ abbreviation: "TOR", name: "Leafs", score: null }),
      }),
    ]);
    renderWidget("sports-bare", "nhl");

    await screen.findByText("MTL");
    const list = screen.getByRole("list", { name: /NHL games/ });
    expect(within(list).queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the whole slate, marking the teams you follow instead of hiding the rest", async () => {
    fetchMock.mockResolvedValue([
      match({
        id: "mine",
        away: team({ abbreviation: "ATL", name: "Braves", score: 2, winner: false }),
        home: team({ abbreviation: "NYY", name: "Yankees", score: 3, winner: true }),
      }),
      match({
        id: "other",
        away: team({ abbreviation: "SEA", name: "Mariners", score: 1, winner: false }),
        home: team({ abbreviation: "TEX", name: "Rangers", score: 4, winner: true }),
      }),
    ]);
    renderWidget("sports-team", "mlb", ["ATL"]);

    expect(await screen.findByText("ATL")).toBeInTheDocument();
    expect(screen.getByText("SEA")).toBeInTheDocument();
    expect(screen.getAllByText("Favourite team,")).toHaveLength(1);
  });
});

describe("a widget that has never been configured", () => {
  it("renders from the store defaults, with no following entry for its league", async () => {
    fetchMock.mockResolvedValue([
      match({
        home: team({ abbreviation: "NYY", score: 3 }),
        away: team({ abbreviation: "BOS", score: 1 }),
      }),
    ]);
    useSportsStore.setState({ byInstance: {} });

    render(
      <WidgetInstanceContext.Provider value="sports-fresh">
        <SportsWidget />
      </WidgetInstanceContext.Provider>,
    );

    expect(await screen.findByText("NYY")).toBeInTheDocument();
  });
});
