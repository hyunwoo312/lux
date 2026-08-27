// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MatchRow } from "@/widgets/sports/components/match/MatchRow";
import { match, team } from "@/widgets/sports/lib/fixtures";

const NOW = Date.parse("2026-08-23T18:00:00.000Z");

describe("MatchRow", () => {
  it("reads as a fixture rather than a result before kick-off", () => {
    render(
      <MatchRow
        match={match({
          state: "pre",
          detail: "8:00 PM",
          startsAt: new Date(NOW).toISOString(),
          home: team({ abbreviation: "ARS", name: "Arsenal", score: null }),
          away: team({ abbreviation: "CHE", name: "Chelsea", score: null }),
        })}
        sport="soccer"
        now={NOW}
        hour12
      />,
    );

    expect(screen.getByText("vs")).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
