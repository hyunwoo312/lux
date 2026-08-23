// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MatchDetail } from "@/widgets/sports/components/match/MatchDetail";
import { match, team } from "@/widgets/sports/lib/fixtures";
import type { MatchEvent } from "@/widgets/sports/types";

const CARD: MatchEvent = { minute: "50'", side: "away", kind: "yellow", player: "S. Mouriño" };

describe("MatchDetail for soccer", () => {
  it("says out loud what each mark on the timeline means", () => {
    render(<MatchDetail sport="soccer" match={match({ state: "post", events: [CARD] })} />);

    expect(screen.getByText(/Yellow card, S. Mouriño/)).toBeInTheDocument();
  });

  it("names a penalty and an own goal rather than showing a plain goal", () => {
    render(
      <MatchDetail
        sport="soccer"
        match={match({
          state: "post",
          events: [
            { minute: "66'", side: "away", kind: "penalty", player: "G. Moreno" },
            { minute: "70'", side: "home", kind: "own-goal", player: "J. Giménez" },
          ],
        })}
      />,
    );

    expect(screen.getByText("(P)")).toBeInTheDocument();
    expect(screen.getByText("(OG)")).toBeInTheDocument();
  });

  it("shows recent form before a game, and not after it", () => {
    const teams = {
      away: team({ abbreviation: "VIL", form: "DDWLL" }),
      home: team({ abbreviation: "ATM", form: "DWLWW" }),
    };
    const { unmount } = render(
      <MatchDetail sport="soccer" match={match({ state: "pre", ...teams })} />,
    );
    expect(screen.getByText("Form")).toBeInTheDocument();
    expect(screen.getByText(/Recent form: D, D, W, L, L/)).toBeInTheDocument();

    unmount();
    render(<MatchDetail sport="soccer" match={match({ state: "post", ...teams })} />);
    expect(screen.queryByText("Form")).not.toBeInTheDocument();
  });

  it("leaves a record it cannot read exactly as it came", () => {
    render(
      <MatchDetail
        sport="baseball"
        match={match({ state: "pre", away: team({ record: "1st in AL East" }) })}
      />,
    );

    expect(screen.getByText("1st in AL East")).toBeInTheDocument();
  });
});
