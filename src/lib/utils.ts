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

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function matchesQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}
