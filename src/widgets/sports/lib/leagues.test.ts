import { describe, expect, it } from "vitest";
import { LEAGUES } from "@/widgets/sports/lib/leagues";

describe("league registry", () => {
  it("gives every league a unique id", () => {
    const ids = LEAGUES.map((league) => league.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
