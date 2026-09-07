import { describe, expect, it } from "vitest";
import { isOverGrid, resolveDrop } from "@/widgets/core/drag";
import { GAP, PAD, UNIT } from "@/widgets/core/grid";
import { WIDGET_LAYOUTS } from "@/widgets/core/types";
import type { DragGeometry } from "@/widgets/core/useWidgetDragStore";

const GEOMETRY: DragGeometry = { left: 100, top: 60, cols: 12 };

const { w, h } = WIDGET_LAYOUTS.note;

function centreOfCell(col: number, row: number, w: number, h: number) {
  return {
    x: GEOMETRY.left + PAD + col * UNIT + (w * UNIT - GAP) / 2,
    y: GEOMETRY.top + PAD + row * UNIT + (h * UNIT - GAP) / 2,
  };
}

describe("isOverGrid", () => {
  it("accepts only points within the board's left, right and top edges", () => {
    expect(isOverGrid(GEOMETRY.left + 10, GEOMETRY.top + 10, GEOMETRY)).toBe(true);
    expect(isOverGrid(GEOMETRY.left - 1, GEOMETRY.top + 10, GEOMETRY)).toBe(false);
    expect(isOverGrid(GEOMETRY.left + 10, GEOMETRY.top - 1, GEOMETRY)).toBe(false);
    const past = GEOMETRY.left + GEOMETRY.cols * UNIT + 1;
    expect(isOverGrid(past, GEOMETRY.top + 10, GEOMETRY)).toBe(false);
  });

  it("has no bottom edge, so a drop below the last row still counts", () => {
    expect(isOverGrid(GEOMETRY.left + 10, GEOMETRY.top + 10_000, GEOMETRY)).toBe(true);
  });
});

describe("resolveDrop", () => {
  it("lands on the cell the pointer is centred over", () => {
    const { x, y } = centreOfCell(3, 2, w, h);

    expect(resolveDrop("note", [], x, y, GEOMETRY).spot).toEqual({ x: 3, y: 2 });
  });

  it("keeps the widget inside the grid when dropped past the right edge", () => {
    const { x, y } = centreOfCell(11, 0, w, h);

    expect(resolveDrop("note", [], x, y, GEOMETRY).spot.x).toBe(GEOMETRY.cols - w);
  });

  it("never places above the first row", () => {
    expect(resolveDrop("note", [], GEOMETRY.left, GEOMETRY.top - 500, GEOMETRY).spot.y).toBe(0);
  });

  it("moves clear of a widget already occupying the target cell", () => {
    const occupied = [{ i: "other", x: 3, y: 2, w, h }];
    const { x, y } = centreOfCell(3, 2, w, h);

    const spot = resolveDrop("note", occupied, x, y, GEOMETRY).spot;

    expect(spot).not.toEqual({ x: 3, y: 2 });
  });

  it("reports a rect that matches the resolved cell, so the drop animation lands true", () => {
    const { x, y } = centreOfCell(3, 2, w, h);

    const { spot, rect } = resolveDrop("note", [], x, y, GEOMETRY);

    expect(rect).toEqual({
      x: GEOMETRY.left + PAD + spot.x * UNIT,
      y: GEOMETRY.top + PAD + spot.y * UNIT,
      w: w * UNIT - GAP,
      h: h * UNIT - GAP,
    });
  });
});
