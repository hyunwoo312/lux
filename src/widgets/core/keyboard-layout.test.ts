import { describe, expect, it } from "vitest";
import { keyboardLayoutItem } from "@/widgets/core/keyboard-layout";
import {
  collides,
  resolveLayoutCollisions,
  resolveLocalDisplacement,
} from "@/widgets/core/layout-engine";

const item = { i: "a", x: 0, y: 0, w: 6, h: 6, minW: 6, minH: 6, maxW: 12, maxH: 12 };

describe("keyboard layout", () => {
  it("clamps movement at the top, left and right edges", () => {
    expect(keyboardLayoutItem(item, "ArrowUp", false, 12)).toEqual(item);
    expect(keyboardLayoutItem(item, "ArrowLeft", false, 12)).toEqual(item);
    expect(keyboardLayoutItem({ ...item, x: 6 }, "ArrowRight", false, 12)?.x).toBe(6);
    expect(keyboardLayoutItem(item, "ArrowDown", false, 12)?.y).toBe(1);
  });

  it("enforces size bounds and shifts a growing widget away from the right edge", () => {
    expect(keyboardLayoutItem(item, "ArrowLeft", true, 12)?.w).toBe(6);
    expect(keyboardLayoutItem(item, "ArrowUp", true, 12)?.h).toBe(6);
    expect(keyboardLayoutItem({ ...item, w: 12, h: 12 }, "ArrowRight", true, 12)?.w).toBe(12);
    expect(keyboardLayoutItem({ ...item, h: 12 }, "ArrowDown", true, 12)?.h).toBe(12);
    expect(keyboardLayoutItem({ ...item, x: 6 }, "ArrowRight", true, 12)).toMatchObject({
      w: 7,
      x: 5,
    });
    expect(keyboardLayoutItem(item, "ArrowRight", true, 4)?.w).toBe(6);
  });

  it("moves colliding neighbours using the pointer layout resolver", () => {
    const moved = keyboardLayoutItem(item, "ArrowRight", false, 12)!;
    const neighbour = { ...item, i: "b", x: 6 };
    const layout = resolveLayoutCollisions(
      resolveLocalDisplacement([moved, neighbour], 12, "a"),
      12,
      "a",
    );
    expect(layout.find((entry) => entry.i === "a")?.x).toBe(1);
    expect(collides(layout[0]!, layout[1]!)).toBe(false);
  });
});
