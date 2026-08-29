import type { TargetAndTransition, Transition, Variants } from "motion/react";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_OUT_STRONG = [0.16, 1, 0.3, 1] as const;
export const EASE_IN = [0.4, 0, 1, 1] as const;
export const EASE_STANDARD = [0.4, 0, 0.2, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;
export const EASE_BACK = [0.34, 1.4, 0.64, 1] as const;
export const EASE_MORPH = [0.2, 0.8, 0.2, 1] as const;

export const DURATION = {
  instant: 0.1,
  fast: 0.15,
  base: 0.25,
  slow: 0.35,
  slower: 0.5,
} as const;

export type Reduced = boolean | null;

export type Speed = keyof typeof DURATION;

type Ease = readonly [number, number, number, number];

const SHORTER: Record<Speed, Speed> = {
  instant: "instant",
  fast: "instant",
  base: "fast",
  slow: "base",
  slower: "slow",
};

const STAGGER = {
  micro: 0.012,
  tight: 0.025,
  base: 0.035,
  loose: 0.06,
} as const;

type Step = keyof typeof STAGGER;

export const STILL: Transition = { duration: 0 };

export function stagger(reduced: Reduced, step: Step = "base"): number {
  return reduced ? 0 : STAGGER[step];
}

export function enterTween(
  reduced: Reduced,
  speed: Speed = "base",
  ease: Ease = EASE_OUT,
): Transition {
  return reduced ? STILL : { duration: DURATION[speed], ease };
}

export function exitTween(
  reduced: Reduced,
  speed: Speed = "base",
  ease: Ease = EASE_IN,
): Transition {
  return reduced ? STILL : { duration: DURATION[SHORTER[speed]], ease };
}

const SPRING_CRISP: Transition = { type: "spring", stiffness: 500, damping: 40 };
const SPRING_SOFT: Transition = { type: "spring", stiffness: 260, damping: 30 };
const SPRING_POP: Transition = { type: "spring", stiffness: 400, damping: 18 };

export function springCrisp(reduced: Reduced): Transition {
  return reduced ? STILL : SPRING_CRISP;
}

export function springSoft(reduced: Reduced): Transition {
  return reduced ? STILL : SPRING_SOFT;
}

export function springPop(reduced: Reduced): Transition {
  return reduced ? STILL : SPRING_POP;
}

const TAP = {
  icon: { whileHover: { scale: 1.18 }, whileTap: { scale: 0.85 } },
  control: { whileHover: { scale: 1.12 }, whileTap: { scale: 0.9 } },
  surface: { whileHover: { scale: 1.04 }, whileTap: { scale: 0.96 } },
} as const;

type TapKind = keyof typeof TAP;

type TapProps = {
  whileHover?: TargetAndTransition;
  whileTap?: TargetAndTransition;
};

export function tap(reduced: Reduced, kind: TapKind): TapProps {
  return reduced ? {} : TAP[kind];
}

type Presence = {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
};

export function fade(reduced: Reduced, speed: Speed = "base"): Presence {
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: enterTween(reduced, speed) },
    exit: { opacity: 0, transition: exitTween(reduced, speed) },
  };
}

export function pop(reduced: Reduced): Presence {
  return {
    initial: { opacity: 0, scale: 0.7 },
    animate: { opacity: 1, scale: 1, transition: enterTween(reduced, "fast") },
    exit: { opacity: 0, scale: 0.7, transition: exitTween(reduced, "fast") },
  };
}

export function iconSwap(reduced: Reduced, sign = 1): Presence {
  const rotate = reduced ? 0 : sign * 90;
  return {
    initial: { opacity: 0, scale: 0.6, rotate },
    animate: { opacity: 1, scale: 1, rotate: 0, transition: enterTween(reduced, "fast") },
    exit: { opacity: 0, scale: 0.6, rotate: -rotate, transition: exitTween(reduced, "fast") },
  };
}

export function collapse(reduced: Reduced, axis: "height" | "width" = "height"): Presence {
  const closed = axis === "height" ? { height: 0 } : { width: 0 };
  const open = axis === "height" ? { height: "auto" } : { width: "auto" };
  return {
    initial: { ...closed, opacity: 0 },
    animate: { ...open, opacity: 1, transition: enterTween(reduced, "base") },
    exit: { ...closed, opacity: 0, transition: exitTween(reduced, "base") },
  };
}

export function viewSwap(reduced: Reduced, offset: number | string = 0): Presence {
  const y = reduced ? 0 : offset;
  return {
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0, transition: enterTween(reduced, "slow") },
    exit: { opacity: 0, y, transition: exitTween(reduced, "slow") },
  };
}

export function panelVariants(reduced: Reduced): Variants {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : 4 },
    show: { opacity: 1, y: 0, transition: enterTween(reduced, "fast") },
    exit: { opacity: 0, y: reduced ? 0 : -4, transition: exitTween(reduced, "fast") },
  };
}

export function listVariants(reduced: Reduced, step: Step = "base"): Variants {
  return {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: stagger(reduced, step) } },
  };
}

export function rowVariants(reduced: Reduced): Variants {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : 6 },
    show: { opacity: 1, y: 0, transition: enterTween(reduced, "base") },
    exit: { opacity: 0, transition: exitTween(reduced, "base") },
  };
}

export function revealVariants(reduced: Reduced): Variants {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : 8 },
    show: { opacity: 1, y: 0, transition: enterTween(reduced, "slow", EASE_OUT_STRONG) },
  };
}
