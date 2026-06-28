import type { Transition } from "motion/react";
import { EASE_OUT_EXPO } from "@/lib/motion";

export const LAYOUT_TRANSITION: Transition = { type: "spring", stiffness: 500, damping: 46 };
export const SLIDE_TRANSITION: Transition = { duration: 0.16, ease: EASE_OUT_EXPO };
