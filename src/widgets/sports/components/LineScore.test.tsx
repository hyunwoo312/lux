// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LineScore } from "@/widgets/sports/components/LineScore";
import { match as baseMatch, team as baseTeam } from "@/widgets/sports/lib/fixtures";
import type { Match, MatchState, MatchTeam } from "@/widgets/sports/types";

function team(overrides: Partial<MatchTeam> = {}): MatchTeam {
  return baseTeam({ abbreviation: "ATH", name: "Athletics", score: 3, ...overrides });
}

function match(state: MatchState, away: MatchTeam, home: MatchTeam): Match {
  return baseMatch({ state, detail: "", away, home });
}

describe("LineScore", () => {
  it("labels the totals R, H and E when the sport reports hits", () => {
    render(
      <LineScore
        match={match(
          "post",
          team({ abbreviation: "ATH", periods: ["0", "1"], hits: 8, errors: 1, score: 1 }),
          team({ abbreviation: "BOS", periods: ["2", "0"], hits: 10, errors: 0, score: 2 }),
        )}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "R" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "H" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "E" })).toBeInTheDocument();
  });

  it("falls back to a single total column for a sport without hits", () => {
    render(
      <LineScore
        match={match(
          "post",
          team({ abbreviation: "KC", periods: ["7", "3", "0", "7"], score: 17 }),
          team({ abbreviation: "DEN", periods: ["0", "10", "7", "3"], score: 20 }),
        )}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "T" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "H" })).not.toBeInTheDocument();
  });

  it("shows a column per period played, including extra time", () => {
    render(
      <LineScore
        match={match(
          "post",
          team({ abbreviation: "ATH", periods: ["0", "0", "0", "1"], score: 1 }),
          team({ abbreviation: "BOS", periods: ["0", "0", "0"], score: 0 }),
        )}
      />,
    );

    for (const label of ["1", "2", "3", "4"]) {
      expect(screen.getByRole("columnheader", { name: label })).toBeInTheDocument();
    }
  });

  it("renders nothing before a game has produced any line score", () => {
    const { container } = render(<LineScore match={match("pre", team(), team())} />);

    expect(container).toBeEmptyDOMElement();
  });
});
