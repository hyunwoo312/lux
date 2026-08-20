export const ACCENT_PRESETS = [
  "violet",
  "indigo",
  "cyan",
  "teal",
  "green",
  "rose",
  "orange",
  "yellow",
] as const;

export type AccentName = (typeof ACCENT_PRESETS)[number];
export type AccentPreset = AccentName | "default";

export const ACCENT_LABELS: Record<AccentName, string> = {
  violet: "Violet",
  indigo: "Indigo",
  cyan: "Cyan",
  teal: "Teal",
  green: "Green",
  rose: "Rose",
  orange: "Orange",
  yellow: "Yellow",
};

const ACCENT_CLASSES: Record<AccentName, string> = {
  violet: "accent-violet",
  indigo: "accent-indigo",
  cyan: "accent-cyan",
  teal: "accent-teal",
  green: "accent-green",
  rose: "accent-rose",
  orange: "accent-orange",
  yellow: "accent-yellow",
};

export function isAccentName(value: unknown): value is AccentName {
  return typeof value === "string" && value in ACCENT_CLASSES;
}

export function accentClass(accent: AccentPreset | undefined): string | undefined {
  if (!accent || accent === "default") return undefined;
  return ACCENT_CLASSES[accent];
}
