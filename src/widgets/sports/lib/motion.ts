import type { Variants } from "motion/react";
import { EASE_OUT_QUINT } from "@/lib/motion";

const ROW_STAGGER_S = 0.04;

export function panelVariants(reduced: boolean): Variants {
  return {
    hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 4 },
    show: { opacity: 1, y: 0, transition: { duration: reduced ? 0 : 0.18, ease: EASE_OUT_QUINT } },
    exit: {
      opacity: 0,
      y: reduced ? 0 : -4,
      transition: { duration: reduced ? 0 : 0.12, ease: EASE_OUT_QUINT },
    },
  };
}

export function listVariants(reduced: boolean): Variants {
  return {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: reduced ? 0 : ROW_STAGGER_S },
    },
  };
}

export function rowVariants(reduced: boolean): Variants {
  return {
    hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 6 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? 0 : 0.22, ease: EASE_OUT_QUINT },
    },
    exit: { opacity: 0, transition: { duration: reduced ? 0 : 0.1 } },
  };
}
