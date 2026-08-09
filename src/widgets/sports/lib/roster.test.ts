import { describe, expect, it } from "vitest";
import { followedView } from "@/widgets/sports/lib/roster";
import { match, team } from "@/widgets/sports/lib/fixtures";
import type { Match, MatchState } from "@/widgets/sports/types";

function game(id: string, away: string, home: string, state: MatchState = "in"): Match {
  return match({
    id,
    state,
    away: team({ abbreviation: away, name: away }),
    home: team({ abbreviation: home, name: home }),
  });
}

describe("followedView", () => {
  const slate = [game("1", "ATL", "NYY"), game("2", "SEA", "TEX"), game("3", "NYY", "BOS", "pre")];

  it("keeps every game a followed team plays, not just the first", () => {
    const view = followedView(slate, slate, ["NYY"]);

    expect(view.matches.map((entry) => entry.id)).toEqual(["1", "3"]);
  });

  it("renders a shared fixture once rather than per followed team", () => {
    const view = followedView(slate, slate, ["ATL", "NYY"]);

    expect(view.matches.map((entry) => entry.id)).toEqual(["1", "3"]);
  });

  it("preserves the incoming order so live games stay on top", () => {
    const view = followedView(slate, slate, ["NYY", "SEA"]);

    expect(view.matches.map((entry) => entry.id)).toEqual(["1", "2", "3"]);
  });

  it("marks a team idle only when it truly has no fixture", () => {
    const view = followedView(slate, slate, ["ATL", "LAD"]);

    expect(view.idle).toEqual(["LAD"]);
  });

  it("does not call a team idle when its game was merely filtered out", () => {
    const visible = slate.filter((entry) => entry.state === "in");
    const view = followedView(visible, slate, ["BOS"]);

    expect(view.idle).toEqual([]);
    expect(view.matches).toEqual([]);
  });
});
