// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/widgets/sports/lib/espn", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/sports/lib/espn")>()),
  fetchScoreboard: vi.fn(),
  parseCachedScoreboard: () => null,
}));

import { fetchScoreboard } from "@/widgets/sports/lib/espn";
import { SportsWidget } from "@/widgets/sports/SportsWidget";
import { useSportsStore } from "@/widgets/sports/useSportsStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { match, team } from "@/widgets/sports/lib/fixtures";

const fetchMock = vi.mocked(fetchScoreboard);

function renderWidget(instanceId: string, leagueId: string, teams: string[] = []) {
  useSportsStore.setState({
    byInstance: {
      [instanceId]: { leagueId, teams, states: ["in", "pre", "post"], window: "today" },
    },
  });
  render(
    <WidgetInstanceContext.Provider value={instanceId}>
      <SportsWidget />
    </WidgetInstanceContext.Provider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useSportsStore.setState({ byInstance: {} });
});

describe("SportsWidget", () => {
  it("shows both teams, the score and the live detail", async () => {
    fetchMock.mockResolvedValue([match()]);
    renderWidget("sports-live", "mlb");

    expect(await screen.findByText("NYM")).toBeInTheDocument();
    expect(screen.getByText("PIT")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("End 7th")).toBeInTheDocument();
  });

  it("marks a live game with the live colour, not the widget accent", async () => {
    fetchMock.mockResolvedValue([
      match({ id: "live", state: "in", detail: "End 7th" }),
      match({ id: "done", state: "post", detail: "Final" }),
    ]);
    renderWidget("sports-signal", "nba");

    const live = await screen.findByText("End 7th");
    expect(live.className).toContain("text-live");
    expect(live.className).not.toContain("text-primary");
    expect(screen.getByText("Final").className).not.toContain("text-live");
  });

  it("marks a live game with the live indicator and leaves others without it", async () => {
    fetchMock.mockResolvedValue([
      match({ id: "live", state: "in", detail: "End 7th" }),
      match({ id: "done", state: "post", detail: "Final" }),
    ]);
    renderWidget("sports-indicator", "nhl");

    await screen.findByText("End 7th");
    expect(screen.getAllByRole("status", { name: "Live" })).toHaveLength(1);
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

  it("does not offer an expander on a followed team with no game", async () => {
    fetchMock.mockResolvedValue([]);
    renderWidget("sports-noexpand", "mlb", ["ATL"]);

    await screen.findByText("No game");
    expect(screen.queryByRole("button", { name: /show details/i })).not.toBeInTheDocument();
  });

  it("says there are no fixtures rather than looking broken", async () => {
    fetchMock.mockResolvedValue([]);
    renderWidget("sports-empty", "nfl");

    expect(await screen.findByText(/No .* fixtures scheduled\./)).toBeInTheDocument();
  });

  it("degrades to a readable message when the scoreboard fails", async () => {
    fetchMock.mockRejectedValue(new Error("boom"));
    renderWidget("sports-error", "nhl");

    expect(await screen.findByText("Scores are unavailable right now.")).toBeInTheDocument();
  });

  it("warns that live detail is unconfirmed for a league we could not verify", async () => {
    fetchMock.mockResolvedValue([match()]);
    renderWidget("sports-unverified", "nhl");

    expect(await screen.findByRole("note")).toHaveTextContent(/NHL live detail is unconfirmed/);
  });

  it("shows no such warning for a league verified against live data", async () => {
    fetchMock.mockResolvedValue([match()]);
    renderWidget("sports-verified", "mlb");

    await screen.findByText("NYM");
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
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
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows only the followed teams' games, not the whole slate", async () => {
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
    expect(screen.getByText("NYY")).toBeInTheDocument();
    expect(screen.queryByText("SEA")).not.toBeInTheDocument();
  });

  it("keeps a followed team visible with No game when it is not playing", async () => {
    fetchMock.mockResolvedValue([
      match({
        id: "other",
        away: team({ abbreviation: "SEA", name: "Mariners", score: 1, winner: false }),
        home: team({ abbreviation: "TEX", name: "Rangers", score: 4, winner: true }),
      }),
    ]);
    renderWidget("sports-idle", "nhl", ["ATL"]);

    expect(await screen.findByText("No game")).toBeInTheDocument();
    expect(screen.getByText("ATL")).toBeInTheDocument();
    expect(screen.queryByText("SEA")).not.toBeInTheDocument();
  });

  it("renders one row when two followed teams play each other", async () => {
    fetchMock.mockResolvedValue([
      match({
        id: "derby",
        away: team({ abbreviation: "ATL", name: "Braves", score: 2, winner: false }),
        home: team({ abbreviation: "NYY", name: "Yankees", score: 3, winner: true }),
      }),
    ]);
    renderWidget("sports-derby", "nba", ["ATL", "NYY"]);

    expect(await screen.findAllByText("ATL")).toHaveLength(1);
    expect(screen.queryByText("No game")).not.toBeInTheDocument();
  });

  it("leaves the score blank for a fixture that has not started", async () => {
    fetchMock.mockResolvedValue([
      match({
        id: "pre",
        state: "pre",
        detail: "8/7 - 9:40 PM EDT",
        away: team({ abbreviation: "SD", name: "Padres", score: null, winner: false }),
        home: team({ abbreviation: "HOU", name: "Astros", score: null, winner: false }),
      }),
    ]);
    renderWidget("sports-pre", "nfl");

    await screen.findByText("SD");
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.queryByText(/EDT/)).not.toBeInTheDocument();
  });
});
