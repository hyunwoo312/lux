import { describe, expect, it } from "vitest";
import { groupMatches } from "@/widgets/sports/lib/grouping";
import { match } from "@/widgets/sports/lib/fixtures";

describe("groupMatches", () => {
  it("bands the slate live, then upcoming, then past, keeping each band whole", () => {
    const sections = groupMatches([
      match({ id: "a", state: "post" }),
      match({ id: "b", state: "in" }),
      match({ id: "c", state: "pre" }),
      match({ id: "d", state: "in" }),
    ]);

    expect(sections.map((section) => section.id)).toEqual(["live", "upcoming", "past"]);
    expect(sections[0]?.matches.map((entry) => entry.id)).toEqual(["b", "d"]);
  });

  it("leaves out a band that has no games in it", () => {
    const sections = groupMatches([match({ id: "a", state: "in" })]);

    expect(sections.map((section) => section.id)).toEqual(["live"]);
  });
});
