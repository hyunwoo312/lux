import type { Transition } from "motion/react";
import {
  DURATION,
  enterTween,
  exitTween,
  springCrisp,
  springPop,
  springSoft,
  stagger,
  STILL,
  tap,
  type Speed,
} from "@/lib/motion";

const SPEEDS = Object.keys(DURATION) as Speed[];

function seconds(transition: Transition): number {
  const duration = (transition as { duration?: number }).duration;
  if (duration === undefined) throw new Error("transition has no duration");
  return duration;
}

describe("motion", () => {
  it("makes every exit shorter than the enter it mirrors", () => {
    const compared = SPEEDS.map((speed) => ({
      speed,
      shorter: seconds(exitTween(false, speed)) < seconds(enterTween(false, speed)),
    }));
    expect(compared).toEqual(SPEEDS.map((speed) => ({ speed, shorter: speed !== "instant" })));
  });

  it("stops every motion when the user asks for reduced motion", () => {
    const transitions: Transition[] = [
      ...SPEEDS.map((speed) => enterTween(true, speed)),
      ...SPEEDS.map((speed) => exitTween(true, speed)),
      springCrisp(true),
      springSoft(true),
      springPop(true),
    ];
    expect(transitions.filter((transition) => transition !== STILL)).toEqual([]);
    expect(stagger(true)).toBe(0);
    expect(tap(true, "glyph")).toEqual({});
  });
});
