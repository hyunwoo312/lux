/// <reference types="node" />
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Transition } from "motion/react";
import {
  DURATION,
  EASE_BACK,
  EASE_IN,
  EASE_OUT,
  EASE_OUT_STRONG,
  EASE_STANDARD,
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

const css = readFileSync(fileURLToPath(new URL("../styles/globals.css", import.meta.url)), "utf8");

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

  it("agrees with the easing and duration tokens in globals.css", () => {
    const curves: Record<string, readonly number[]> = {
      out: EASE_OUT,
      "out-strong": EASE_OUT_STRONG,
      in: EASE_IN,
      standard: EASE_STANDARD,
      back: EASE_BACK,
    };
    const declaredEases = [...css.matchAll(/--ease-([a-z-]+):\s*cubic-bezier\(([^)]+)\);/g)];
    expect(declaredEases.map(([, name]) => name).sort()).toEqual(Object.keys(curves).sort());
    for (const [, name, points] of declaredEases) {
      expect({ [`ease-${name}`]: points?.split(",").map(Number) }).toEqual({
        [`ease-${name}`]: [...(curves[name ?? ""] ?? [])],
      });
    }

    const declaredDurations = [...css.matchAll(/--duration-([a-z]+):\s*(\d+)ms;/g)];
    expect(declaredDurations.length).toBeGreaterThan(0);
    for (const [, name, ms] of declaredDurations) {
      expect({ [`duration-${name}`]: DURATION[(name ?? "") as Speed] }).toEqual({
        [`duration-${name}`]: Number(ms) / 1000,
      });
    }
  });
});
