// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("@/widgets/sports/lib/espn", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/sports/lib/espn")>()),
  fetchScoreboardDay: vi.fn(),
  parseCachedScoreboard: () => null,
}));
vi.mock("@/widgets/sports/lib/summary", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/sports/lib/summary")>()),
  fetchGameSummary: vi.fn(),
}));

import { fetchScoreboardDay } from "@/widgets/sports/lib/espn";
import { fetchGameSummary } from "@/widgets/sports/lib/summary";
import { SportsWidget } from "@/widgets/sports/SportsWidget";
import { useSportsStore } from "@/widgets/sports/useSportsStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { clearPolledResources, patchPolledResource } from "@/widgets/core/usePolledResource";
import { sportsScoreboard } from "@/widgets/sports/lib/resources";
import { leagueById } from "@/widgets/sports/lib/leagues";
import type { Scoreboard } from "@/widgets/sports/lib/scoreboardDays";
import { match, seedSportsInstance, team } from "@/widgets/sports/lib/fixtures";

import { useSportsViewStore } from "@/widgets/sports/useSportsViewStore";

import { TooltipProvider } from "@/components/ui/tooltip";
import { SportsHeader } from "@/widgets/sports/components/SportsHeader";

const fetchMock = vi.mocked(fetchScoreboardDay);

function renderWidget(instanceId: string, leagueId: string, teams: string[] = []) {
  seedSportsInstance(instanceId, {
    leagueId,
    following: { [leagueId]: { teams } },
    window: "today",
  });
  render(
    <WidgetInstanceContext.Provider value={instanceId}>
      <TooltipProvider>
        <SportsHeader />
        <SportsWidget />
      </TooltipProvider>
    </WidgetInstanceContext.Provider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useSportsViewStore.setState({ byInstance: {} });
  clearPolledResources();
  useSportsStore.setState({ byInstance: {} });
});

describe("SportsWidget", () => {
  it("refreshes final statistics when an open live game finishes", async () => {
    fetchMock.mockResolvedValue([match({ id: "finishing" })]);
    const summary = {
      eventId: "finishing",
      context: "game" as const,
      players: [],
      drives: [],
      plays: [],
      stats: [{ key: "totalYards", label: "Total yards", away: "436", home: "454" }],
    };
    vi.mocked(fetchGameSummary)
      .mockResolvedValueOnce(summary)
      .mockResolvedValue({ ...summary, stats: [{ ...summary.stats[0]!, away: "448" }] });
    renderWidget("sports-final", "nfl");
    fireEvent.click(await screen.findByRole("button", { name: /show details/i }));
    fireEvent.click(await screen.findByRole("tab", { name: "Stats" }));
    expect(screen.getByText("436")).toBeInTheDocument();
    act(() =>
      patchPolledResource<Scoreboard>(
        sportsScoreboard(leagueById("nfl")!, "today", new Date()).cacheKey,
        (board) => ({
          ...board,
          matches: board.matches.map((game) => ({ ...game, state: "post", detail: "Final" })),
        }),
      ),
    );
    expect(await screen.findByText("448")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Stats" })).toHaveAttribute("aria-selected", "true");
    expect(fetchGameSummary).toHaveBeenCalledTimes(2);
  });

  it("loads detail only for the opened game and returns focus to its score row", async () => {
    fetchMock.mockResolvedValue([
      match({
        id: "nfl-game",
        away: team({ id: "a", name: "Bills" }),
        home: team({ id: "h", name: "Rams" }),
      }),
    ]);
    vi.mocked(fetchGameSummary).mockResolvedValue({
      eventId: "nfl-game",
      context: "game",
      players: [],
      drives: [],
      plays: [],
      stats: [
        {
          key: "totalYards",
          label: "Total yards",
          away: "436",
          home: "454",
          awayValue: 436,
          homeValue: 454,
        },
      ],
    });
    renderWidget("sports-lazy", "nfl");
    const row = await screen.findByRole("button", { name: /show details/i });
    expect(fetchGameSummary).not.toHaveBeenCalled();
    fireEvent.click(row);
    const stats = await screen.findByRole("tab", { name: "Stats" });
    fireEvent.click(stats);
    expect(screen.getByText("436")).toBeInTheDocument();
    expect(fetchGameSummary).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Back to scores" }));
    expect(row).toHaveFocus();
  });

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
    renderWidget("sports-detail", "mlb");

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

    fireEvent.click(await screen.findByRole("button", { name: /either side of this date/i }));

    expect(useSportsStore.getState().byInstance["sports-widen"]?.window).toBe("week");
  });

  it("degrades to a readable message when the scoreboard fails", async () => {
    fetchMock.mockRejectedValue(new Error("boom"));
    renderWidget("sports-error", "nhl");

    expect(await screen.findByText("Couldn’t load scores.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows supplied league data without a development verification notice", async () => {
    fetchMock.mockResolvedValue([match()]);
    renderWidget("sports-unverified", "nhl");

    expect(await screen.findByRole("list", { name: /NHL games/i })).toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("opens an overview for a scheduled fixture", async () => {
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
    expect(within(list).getByRole("button", { name: /show details/i })).toBeInTheDocument();
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
    expect(screen.getAllByLabelText("Followed team")).toHaveLength(1);
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
        <TooltipProvider>
          <SportsHeader />
          <SportsWidget />
        </TooltipProvider>
      </WidgetInstanceContext.Provider>,
    );

    expect(await screen.findByText("NYY")).toBeInTheDocument();
  });
});
