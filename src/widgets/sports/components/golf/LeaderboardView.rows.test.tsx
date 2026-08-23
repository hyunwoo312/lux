// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/widgets/sports/lib/golf", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/sports/lib/golf")>()),
  fetchLeaderboard: vi.fn(),
  parseCachedLeaderboard: () => null,
}));

import { fireEvent, render, screen } from "@testing-library/react";
import { clearPolledResources } from "@/widgets/core/usePolledResource";
import { LeaderboardView } from "@/widgets/sports/components/golf/LeaderboardView";
import { fetchLeaderboard, type Leaderboard } from "@/widgets/sports/lib/golf";
import { leagueById, type League } from "@/widgets/sports/lib/leagues";

const fetchMock = vi.mocked(fetchLeaderboard);
const PGA = leagueById("pga") as League;

const BOARD: Leaderboard = {
  name: "BMW Championship",
  state: "post",
  detail: "Final",
  players: [
    {
      id: "1",
      name: "W. Clark",
      score: "-17",
      position: "1",
      card: [
        { round: 1, toPar: "-6", strokes: "64" },
        { round: 2, toPar: "-6", strokes: "64" },
      ],
      scoring: { eagles: 1, birdies: 21, pars: 45, bogeys: 4, worse: 1 },
      madeCut: true,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  clearPolledResources();
});

describe("a golf player row", () => {
  it("counts the week's holes into a scoring line", async () => {
    fetchMock.mockResolvedValue(BOARD);
    render(<LeaderboardView league={PGA} />);

    fireEvent.click(await screen.findByRole("button", { name: /show round detail/ }));

    expect(screen.getByText("Birdie")).toBeInTheDocument();
    expect(screen.getByText("21")).toBeInTheDocument();
  });

  it("stays flat for a player with no card to show", async () => {
    fetchMock.mockResolvedValue({
      ...BOARD,
      players: [{ ...BOARD.players[0]!, card: [], scoring: undefined }],
    });
    render(<LeaderboardView league={PGA} />);
    await screen.findByText("W. Clark");

    expect(screen.queryByRole("button", { name: /show round detail/ })).not.toBeInTheDocument();
  });
});
