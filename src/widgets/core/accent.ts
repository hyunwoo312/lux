import type { CSSProperties } from "react";

export type AccentPreset =
  | "default"
  | "violet"
  | "indigo"
  | "cyan"
  | "green"
  | "rose"
  | "orange"
  | "yellow";

type AccentDefinition = {
  primary: string;
  primaryForeground: string;
  gradient?: string;
};

export const ACCENT_PRESETS: Record<AccentPreset, AccentDefinition> = {
  default: {
    primary: "var(--foreground)",
    primaryForeground: "var(--background)",
  },
  violet: {
    primary: "oklch(0.56 0.21 292)",
    primaryForeground: "oklch(0.99 0.01 292)",
  },
  indigo: {
    primary: "oklch(0.5 0.18 274)",
    primaryForeground: "oklch(0.99 0.01 274)",
  },
  cyan: {
    primary: "oklch(0.62 0.12 218)",
    primaryForeground: "oklch(0.99 0.01 218)",
    gradient: "oklch(0.64 0.16 220)",
  },
  green: {
    primary: "oklch(0.74 0.2 148)",
    primaryForeground: "oklch(0.22 0.05 150)",
    gradient: "oklch(0.76 0.21 146)",
  },
  rose: {
    primary: "oklch(0.6 0.2 12)",
    primaryForeground: "oklch(0.99 0.01 12)",
  },
  orange: {
    primary: "oklch(0.7 0.18 47)",
    primaryForeground: "oklch(0.99 0.01 60)",
    gradient: "oklch(0.72 0.19 50)",
  },
  yellow: {
    primary: "oklch(0.88 0.14 98)",
    primaryForeground: "oklch(0.34 0.06 90)",
    gradient: "oklch(0.8 0.15 90)",
  },
};

export function getAccentVars(accent: AccentPreset): CSSProperties {
  const preset = ACCENT_PRESETS[accent];
  return {
    "--primary": preset.primary,
    "--primary-foreground": preset.primaryForeground,
    "--ring": preset.primary,
    "--widget-gradient": preset.gradient ?? preset.primary,
  } as CSSProperties;
}
