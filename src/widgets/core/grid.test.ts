import { describe, expect, it } from "vitest";
import { boardWidth, UNIT } from "@/widgets/core/grid";

describe("boardWidth", () => {
  it("never leaves more than one column of the viewport unused", () => {
    for (let viewport = 1900; viewport <= 1960; viewport += 1) {
      const unused = viewport - 100 - boardWidth(viewport);
      expect(unused).toBeGreaterThanOrEqual(0);
      expect(unused).toBeLessThan(UNIT);
    }
  });

  it("keeps a usable board on a very narrow window", () => {
    expect(boardWidth(120)).toBe(UNIT);
  });
});
