// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MatchRow } from "@/widgets/sports/components/match/MatchRow";
import type { Match, MatchTeam } from "@/widgets/sports/types";

const NOW = Date.parse("2026-08-23T18:00:00.000Z");

function team(abbreviation: string, score: number | null, winner = false): MatchTeam {
  return { abbreviation, name: abbreviation, score, winner, periods: [], leaders: [] };
}

function match(over: Partial<Match> = {}): Match {
  return {
    id: "m1",
    state: "post",
    detail: "FT",
    startsAt: new Date(NOW).toISOString(),
    home: team("ARS", 1),
    away: team("CHE", 1),
    events: [],
    stats: [],
    ...over,
  };
}

function renderRow(value: Match) {
  return render(<MatchRow match={value} sport="soccer" now={NOW} hour12 />);
}

describe("MatchRow", () => {
  it("reads as a fixture rather than a result before kick-off", () => {
    renderRow(
      match({
        state: "pre",
        detail: "8:00 PM",
        home: team("ARS", null),
        away: team("CHE", null),
      }),
    );

    expect(screen.getByText("vs")).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
