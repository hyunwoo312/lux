import {
  collides,
  findNearestOpenPosition,
  resolveLayoutCollisions,
  resolveLocalDisplacement,
} from "@/widgets/core/layout-engine";

const item = (i: string, x: number, y: number, w: number, h: number) => ({ i, x, y, w, h });

describe("layout-engine", () => {
  it("detects overlap, ignoring identical ids", () => {
    expect(collides(item("a", 0, 0, 2, 2), item("b", 1, 1, 2, 2))).toBe(true);
    expect(collides(item("a", 0, 0, 2, 2), item("b", 2, 0, 2, 2))).toBe(false);
    expect(collides(item("a", 0, 0, 2, 2), item("a", 0, 0, 2, 2))).toBe(false);
  });

  it("finds an open position when the target cell is occupied", () => {
    const placed = [item("b", 0, 0, 2, 2)];
    const position = findNearestOpenPosition(item("a", 0, 0, 2, 2), placed, 6, { dx: 1, dy: 0 });
    expect(collides({ ...item("a", 0, 0, 2, 2), ...position }, placed[0]!)).toBe(false);
  });

  it("displaces the overlapped neighbour while the priority item stays put", () => {
    const layout = [item("a", 0, 0, 2, 2), item("b", 1, 0, 2, 2)];
    const resolved = resolveLocalDisplacement(layout, 8, "a", { dx: 1, dy: 0 });

    const a = resolved.find((entry) => entry.i === "a")!;
    const b = resolved.find((entry) => entry.i === "b")!;
    expect(a.x).toBe(0);
    expect(collides(a, b)).toBe(false);
  });

  it("reflows items that no longer fit the column count", () => {
    const resolved = resolveLayoutCollisions([item("a", 5, 0, 2, 2)], 4, null, { dx: 1, dy: 0 });
    const a = resolved.find((entry) => entry.i === "a")!;
    expect(a.x + a.w).toBeLessThanOrEqual(4);
  });
});
