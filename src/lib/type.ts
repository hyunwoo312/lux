export const TYPE_SCALE = [
  "micro",
  "caption",
  "body",
  "body-lg",
  "title",
  "heading",
  "display-sm",
  "display",
  "display-lg",
] as const;

export const TYPE = {
  display: "text-display font-semibold tracking-[-0.025em] tabular-nums slashed-zero",

  heading: "text-heading font-semibold tracking-[-0.015em] text-ink",
  title: "text-title font-semibold tracking-[-0.005em] text-ink",

  rowSubtitle: "text-caption text-ink-3",
  rowMeta: "text-caption text-ink-4",

  label: "text-body font-medium text-ink-2",
  help: "text-caption text-ink-3 leading-relaxed",
  eyebrow: "text-micro font-semibold tracking-[0.06em] text-ink-4 uppercase",
} as const;

export type TypeRole = keyof typeof TYPE;
