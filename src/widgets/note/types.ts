import type { AccentPreset } from "@/widgets/core/accent";

export const NOTE_ACCENT: AccentPreset = "yellow";

export const NOTE_MAX_LENGTH = 10_000;

export const NOTE_FONT_SIZES = ["sm", "base", "lg"] as const;
export type NoteFontSize = (typeof NOTE_FONT_SIZES)[number];
