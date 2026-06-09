import type { Transition } from "motion/react";

export const LAYOUT_TRANSITION: Transition = { type: "spring", stiffness: 500, damping: 46 };
export const SLIDE_TRANSITION: Transition = { duration: 0.16, ease: [0.16, 1, 0.3, 1] };
