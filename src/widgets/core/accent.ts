export type AccentPreset = "default" | "violet" | "indigo" | "cyan" | "emerald" | "rose";

type AccentDefinition = {
  primary: string;
  primaryForeground: string;
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
  },
  emerald: {
    primary: "oklch(0.62 0.14 162)",
    primaryForeground: "oklch(0.99 0.01 162)",
  },
  rose: {
    primary: "oklch(0.6 0.2 12)",
    primaryForeground: "oklch(0.99 0.01 12)",
  },
};
