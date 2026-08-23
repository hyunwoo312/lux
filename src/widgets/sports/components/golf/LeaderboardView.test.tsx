// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/widgets/sports/lib/golf", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/sports/lib/golf")>()),
  fetchLeaderboard: vi.fn(),
  parseCachedLeaderboard: () => null,
}));

import { render, screen } from "@testing-library/react";
import { clearPolledResources } from "@/widgets/core/usePolledResource";
import { LeaderboardView } from "@/widgets/sports/components/golf/LeaderboardView";
import {
  fetchLeaderboard,
  type Leaderboard,
  type LeaderboardPlayer,
} from "@/widgets/sports/lib/golf";
import { leagueById, type League } from "@/widgets/sports/lib/leagues";

const fetchMock = vi.mocked(fetchLeaderboard);
const PGA = leagueById("pga") as League;

function player(over: Partial<LeaderboardPlayer> = {}): LeaderboardPlayer {
  return {
    id: "1",
    name: "M. Brennan",
    score: "-22",
    position: "1",
    card: [{ round: 1, toPar: "-6", strokes: "64" }],
    madeCut: true,
    ...over,
  };
}

function board(over: Partial<Leaderboard> = {}): Leaderboard {
  return {
    name: "Wyndham Championship",
    state: "post",
    detail: "Final",
    players: [player()],
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  clearPolledResources();
});

describe("LeaderboardView", () => {
  it("separates the players who missed the cut from the field", async () => {
    fetchMock.mockResolvedValue(
      board({
        players: [
          player(),
          player({ id: "9", name: "A. Wise", score: "+3", position: "", madeCut: false }),
        ],
      }),
    );
    render(<LeaderboardView league={PGA} />);

    expect(await screen.findByText("Missed the cut")).toBeInTheDocument();
  });

  it("shows today's round only while the tournament is being played", async () => {
    const players = [player({ today: "-4" })];
    fetchMock.mockResolvedValue(board({ state: "in", detail: "Round 3", players }));
    const { unmount } = render(<LeaderboardView league={PGA} />);
    expect(await screen.findByText("-4")).toBeInTheDocument();

    unmount();
    clearPolledResources();
    fetchMock.mockResolvedValue(board({ players }));
    render(<LeaderboardView league={PGA} />);
    await screen.findByText("M. Brennan");
    expect(screen.queryByText("-4")).not.toBeInTheDocument();
  });
});
