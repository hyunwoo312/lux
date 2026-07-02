import {
  collides,
  findFirstOpenPosition,
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
    const position = findNearestOpenPosition(item("a", 0, 0, 2, 2), placed, 6);
    expect(collides({ ...item("a", 0, 0, 2, 2), ...position }, placed[0]!)).toBe(false);
  });

  it("fills the current row to the right before wrapping below", () => {
    const placed = [item("a", 0, 0, 6, 6)];
    expect(findFirstOpenPosition(item("b", 0, 0, 6, 6), placed, 18)).toEqual({ x: 6, y: 0 });
    expect(
      findFirstOpenPosition(item("c", 0, 0, 6, 6), [...placed, item("b", 6, 0, 6, 6)], 18),
    ).toEqual({
      x: 12,
      y: 0,
    });
  });

  it("wraps to the next row only when the current rows are full", () => {
    const placed = [item("a", 0, 0, 6, 6), item("b", 6, 0, 6, 6)];
    expect(findFirstOpenPosition(item("c", 0, 0, 6, 6), placed, 12)).toEqual({ x: 0, y: 6 });
  });

  it("pushes a neighbour out of its less-covered side while the priority item stays put", () => {
    const layout = [item("a", 0, 0, 2, 2), item("b", 1, 0, 2, 2)];
    const resolved = resolveLocalDisplacement(layout, 8, "a");

    const a = resolved.find((entry) => entry.i === "a")!;
    const b = resolved.find((entry) => entry.i === "b")!;
    expect(a.x).toBe(0);
    expect(b.x).toBe(2);
    expect(b.y).toBe(0);
    expect(collides(a, b)).toBe(false);
  });

  it("displaces toward the nearest empty space when the preferred side is blocked", () => {
    const layout = [item("a", 1, 0, 2, 2), item("b", 0, 0, 2, 2), item("c", 3, 0, 2, 2)];
    const resolved = resolveLocalDisplacement(layout, 5, "a");

    const a = resolved.find((entry) => entry.i === "a")!;
    const b = resolved.find((entry) => entry.i === "b")!;
    expect(a.x).toBe(1);
    expect(b.x).toBe(0);
    expect(b.y).toBe(2);
  });

  it("pushes a neighbour downward when a grown widget overlaps it from above", () => {
    const layout = [item("a", 0, 0, 2, 3), item("b", 0, 2, 2, 2)];
    const resolved = resolveLocalDisplacement(layout, 8, "a");

    const a = resolved.find((entry) => entry.i === "a")!;
    const b = resolved.find((entry) => entry.i === "b")!;
    expect(a.y).toBe(0);
    expect(b.x).toBe(0);
    expect(b.y).toBe(3);
    expect(collides(a, b)).toBe(false);
  });

  it("stays collision-free when a wide drop covers two neighbours", () => {
    const layout = [item("a", 0, 0, 4, 2), item("b", 0, 0, 2, 2), item("c", 2, 0, 2, 2)];
    const resolved = resolveLocalDisplacement(layout, 8, "a");

    const a = resolved.find((entry) => entry.i === "a")!;
    const b = resolved.find((entry) => entry.i === "b")!;
    const c = resolved.find((entry) => entry.i === "c")!;
    expect(a.x).toBe(0);
    expect(a.y).toBe(0);
    expect(collides(a, b)).toBe(false);
    expect(collides(a, c)).toBe(false);
    expect(collides(b, c)).toBe(false);
  });

  it("reflows items that no longer fit the column count", () => {
    const resolved = resolveLayoutCollisions([item("a", 5, 0, 2, 2)], 4, null);
    const a = resolved.find((entry) => entry.i === "a")!;
    expect(a.x + a.w).toBeLessThanOrEqual(4);
  });

  it("keeps the priority item fixed and relocates an overlapping sibling", () => {
    const layout = [item("a", 0, 0, 2, 2), item("b", 0, 0, 2, 2)];
    const resolved = resolveLayoutCollisions(layout, 8, "a");

    const a = resolved.find((entry) => entry.i === "a")!;
    const b = resolved.find((entry) => entry.i === "b")!;
    expect(a.x).toBe(0);
    expect(a.y).toBe(0);
    expect(collides(a, b)).toBe(false);
  });
});
