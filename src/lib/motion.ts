import type { Transition, Variants } from "motion/react";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_OUT_STRONG = [0.16, 1, 0.3, 1] as const;
export const EASE_IN = [0.4, 0, 1, 1] as const;
export const EASE_STANDARD = [0.4, 0, 0.2, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;
export const EASE_BACK = [0.34, 1.56, 0.64, 1] as const;
export const EASE_MORPH = [0.2, 0.8, 0.2, 1] as const;

export const DURATION = {
  instant: 0.1,
  fast: 0.15,
  base: 0.25,
  slow: 0.35,
} as const;

export const TAP = {
  icon: { whileHover: { scale: 1.18 }, whileTap: { scale: 0.85 } },
  control: { whileHover: { scale: 1.12 }, whileTap: { scale: 0.9 } },
  surface: { whileHover: { scale: 1.04 }, whileTap: { scale: 0.96 } },
} as const;

export const SPRING_CRISP: Transition = { type: "spring", stiffness: 500, damping: 40 };
export const SPRING_SOFT: Transition = { type: "spring", stiffness: 260, damping: 30 };
export const SPRING_POP: Transition = { type: "spring", stiffness: 400, damping: 18 };

const STAGGER = 0.035;

export const POP = {
  initial: { opacity: 0, scale: 0.7 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.7 },
  transition: { duration: DURATION.fast, ease: EASE_OUT },
} as const;

export function panelVariants(reduced: boolean): Variants {
  return {
    hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 4 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? 0 : DURATION.fast, ease: EASE_OUT },
    },
    exit: {
      opacity: 0,
      y: reduced ? 0 : -4,
      transition: { duration: reduced ? 0 : DURATION.instant, ease: EASE_IN },
    },
  };
}

export function listVariants(reduced: boolean): Variants {
  return {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: reduced ? 0 : STAGGER } },
  };
}

export function rowVariants(reduced: boolean): Variants {
  return {
    hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 6 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? 0 : DURATION.base, ease: EASE_OUT },
    },
    exit: { opacity: 0, transition: { duration: reduced ? 0 : DURATION.instant } },
  };
}
