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

const slate = [game("1", "ATL", "NYY"), game("2", "SEA", "TEX"), game("3", "NYY", "BOS", "pre")];

describe("followedView", () => {
  it("keeps every game a followed team plays, once each and in slate order", () => {
    expect(followedView(slate, slate, ["ATL", "NYY"]).matches.map((m) => m.id)).toEqual(["1", "3"]);
  });

  it("marks a team idle only when it truly has no fixture", () => {
    expect(followedView(slate, slate, ["ATL", "LAD"]).idle).toEqual(["LAD"]);
  });

  it("does not call a team idle when its game was merely filtered out of view", () => {
    const visible = slate.filter((entry) => entry.state === "in");

    expect(followedView(visible, slate, ["BOS"]).idle).toEqual([]);
  });
});
