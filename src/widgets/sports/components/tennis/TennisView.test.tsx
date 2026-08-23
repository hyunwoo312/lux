// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/widgets/sports/lib/tennis", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/widgets/sports/lib/tennis")>()),
  fetchTennis: vi.fn(),
  parseCachedTennis: () => null,
}));

import { render, screen } from "@testing-library/react";
import { clearPolledResources } from "@/widgets/core/usePolledResource";
import { TennisView } from "@/widgets/sports/components/tennis/TennisView";
import { fetchTennis, type TennisEvent, type TennisMatch } from "@/widgets/sports/lib/tennis";
import { leagueById, type League } from "@/widgets/sports/lib/leagues";

const fetchMock = vi.mocked(fetchTennis);
const ATP = leagueById("atp") as League;

function sets(games: number[], won: boolean[]) {
  return games.map((value, index) => ({ games: `${value}`, won: won[index] ?? false }));
}

function tennisMatch(over: Partial<TennisMatch> = {}): TennisMatch {
  return {
    id: "m1",
    state: "post",
    detail: "Final",
    round: "Round 1",
    startsAt: "2026-08-24T19:35Z",
    home: { name: "P. Herbert", sets: sets([6, 4, 6], [true, false, true]), winner: true },
    away: { name: "K. Miyoshi", sets: sets([2, 6, 2], [false, true, false]), winner: false },
    ...over,
  };
}

function event(over: Partial<TennisEvent> = {}): TennisEvent {
  return {
    name: "Winston-Salem",
    state: "post",
    detail: "Final",
    draws: [{ id: "1", label: "Men's Singles", matches: [tennisMatch()] }],
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  clearPolledResources();
});

describe("TennisView", () => {
  it("bands the draw into live, upcoming and past", async () => {
    fetchMock.mockResolvedValue(
      event({
        draws: [
          {
            id: "1",
            label: "Men's Singles",
            matches: [
              tennisMatch({ id: "live", state: "in", detail: "1st" }),
              tennisMatch({ id: "done", state: "post" }),
            ],
          },
        ],
      }),
    );
    render(<TennisView league={ATP} />);

    expect(await screen.findByText("Live")).toBeInTheDocument();
    expect(screen.getByText("Past")).toBeInTheDocument();
  });

  it("offers the other draws when a tournament has more than one", async () => {
    fetchMock.mockResolvedValue(
      event({
        draws: [
          { id: "1", label: "Men's Singles", matches: [tennisMatch()] },
          { id: "2", label: "Women's Singles", matches: [tennisMatch({ id: "m2" })] },
        ],
      }),
    );
    render(<TennisView league={ATP} />);

    expect(await screen.findByRole("combobox", { name: "Draw" })).toBeInTheDocument();
  });

  it("offers no expander on a match that has not been played yet", async () => {
    fetchMock.mockResolvedValue(
      event({
        draws: [
          {
            id: "1",
            label: "Men's Singles",
            matches: [
              tennisMatch({
                state: "pre",
                detail: "7:00 PM",
                home: { name: "P. Herbert", sets: [], winner: false },
                away: { name: "K. Miyoshi", sets: [], winner: false },
              }),
            ],
          },
        ],
      }),
    );
    render(<TennisView league={ATP} />);
    await screen.findByText("P. Herbert");

    expect(screen.queryByRole("button", { name: /show details/i })).not.toBeInTheDocument();
  });

  it("marks a tiebreak beside the set it belongs to", async () => {
    fetchMock.mockResolvedValue(
      event({
        draws: [
          {
            id: "1",
            label: "Men's Singles",
            matches: [
              tennisMatch({
                home: {
                  name: "J. Fearnley",
                  sets: [{ games: "7", won: true, tiebreak: 7 }],
                  winner: true,
                },
                away: {
                  name: "R. Baena",
                  sets: [{ games: "6", won: false, tiebreak: 3 }],
                  winner: false,
                },
              }),
            ],
          },
        ],
      }),
    );
    render(<TennisView league={ATP} />);

    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(screen.getByText("7", { selector: "span.absolute" })).toBeInTheDocument();
  });
});
