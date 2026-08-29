import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { TYPE_SCALE } from "@/lib/type";

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...TYPE_SCALE] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
