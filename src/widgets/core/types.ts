import type { IntegrationProviderId } from "@/integrations";
import type { ComponentType } from "react";
import type { AccentPreset } from "@/widgets/core/accent";

export type WidgetIcon = ComponentType<{ className?: string }>;

export const WIDGET_TYPES = [
  "tasks",
  "quickAccess",
  "image",
  "calendar",
  "spotify",
  "github",
  "weather",
  "anilist",
  "note",
  "stocks",
  "news",
  "sports",
] as const;
export type WidgetType = (typeof WIDGET_TYPES)[number];

export const WIDGET_CATEGORIES = ["productivity", "media", "information"] as const;
export type WidgetCategory = (typeof WIDGET_CATEGORIES)[number];

export const WIDGET_CATEGORY_LABELS: Record<WidgetCategory, string> = {
  productivity: "Productivity",
  media: "Media",
  information: "Information",
};

export type WidgetInstance = {
  id: string;
  type: WidgetType;
};

type WidgetLayout = {
  w: number;
  h: number;
  minW: number;
  minH: number;
  maxW: number;
  maxH: number;
};

export const WIDGET_LAYOUTS: Record<WidgetType, WidgetLayout> = {
  tasks: { w: 6, h: 6, minW: 6, minH: 6, maxW: 12, maxH: 12 },
  quickAccess: { w: 6, h: 6, minW: 6, minH: 6, maxW: 12, maxH: 12 },
  image: { w: 5, h: 5, minW: 5, minH: 5, maxW: 12, maxH: 12 },
  calendar: { w: 8, h: 9, minW: 6, minH: 6, maxW: 14, maxH: 14 },
  spotify: { w: 8, h: 5, minW: 8, minH: 5, maxW: 14, maxH: 14 },
  github: { w: 8, h: 7, minW: 6, minH: 6, maxW: 10, maxH: 10 },
  weather: { w: 6, h: 6, minW: 6, minH: 6, maxW: 12, maxH: 12 },
  anilist: { w: 8, h: 9, minW: 6, minH: 7, maxW: 12, maxH: 12 },
  note: { w: 6, h: 6, minW: 6, minH: 6, maxW: 12, maxH: 12 },
  stocks: { w: 6, h: 6, minW: 6, minH: 6, maxW: 14, maxH: 14 },
  news: { w: 8, h: 8, minW: 8, minH: 8, maxW: 14, maxH: 14 },
  sports: { w: 8, h: 8, minW: 8, minH: 8, maxW: 14, maxH: 14 },
};

export type WidgetContentProps = {
  editing: boolean;
  justAdded: boolean;
};

export type WidgetLock = {
  message: string;
  actionLabel: string;
  onAction: () => void;
};

type SignedOut = { mode: "lock"; label: string; subject: string } | { mode: "degrade" };

export type WidgetFrame = {
  bleed?: boolean;
  backdrop?: ComponentType;
  decorativeBackdrop?: boolean;
  useBare?: (instanceId: string) => boolean;
};

export type CommandSetup = { reason: string; run: () => void };

export type LabelSegment = { text: string } | { image: string };

export type CommandResult = {
  id: string;
  label: string;
  detail?: string;
  meta?: string;
  metaTone?: "positive" | "negative";
  section?: string;
  icon?: WidgetIcon;
  artworkUrl?: string;
  labelSegments?: readonly LabelSegment[];
  run: () => void | Promise<void>;
};

type WidgetCommandBase = {
  id: string;
  label: string;
  description: string;
  icon: WidgetIcon;
  keywords?: readonly string[];
  setup?: () => CommandSetup | null;
};

export type WidgetCommand =
  | (WidgetCommandBase & { kind: "action"; run: () => void | Promise<void> })
  | (WidgetCommandBase & {
      kind: "provider";
      placeholder: string;
      emptyMessage?: (query: string) => string;
      search: (query: string, signal: AbortSignal) => Promise<CommandResult[]>;
    });

export type WidgetPlugin = {
  type: WidgetType;
  name: string;
  category: WidgetCategory;
  description: string;
  recommended?: boolean;
  icon: WidgetIcon;
  brandIcon?: boolean;
  component: ComponentType<WidgetContentProps>;
  clearInstance: (instanceId: string) => void;
  configComponent?: ComponentType;
  statusComponent?: ComponentType;
  headerActionComponent?: ComponentType;
  refreshMs?: number;
  tint?: AccentPreset;
  requiresAccount?: IntegrationProviderId[];
  signedOut?: SignedOut;
  commands?: () => readonly WidgetCommand[];
  frame?: WidgetFrame;
  removalNote?: (instanceId: string) => string | null;
};
