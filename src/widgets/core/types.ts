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

export type WidgetContentProps = {
  editing: boolean;
};

export type WidgetLock = {
  message: string;
  actionLabel: string;
  onAction: () => void;
};

export type WidgetFrame = {
  bleed?: boolean;
  backdrop?: ComponentType;
  decorativeBackdrop?: boolean;
  useBare?: (instanceId: string) => boolean;
};

export type WidgetPlugin = {
  type: WidgetType;
  name: string;
  category: WidgetCategory;
  description: string;
  recommended?: boolean;
  icon: WidgetIcon;
  brandIcon?: boolean;
  defaultLayout: { w: number; h: number; minW: number; minH: number; maxW: number; maxH: number };
  component: ComponentType<WidgetContentProps>;
  configComponent?: ComponentType;
  statusComponent?: ComponentType;
  headerActionComponent?: ComponentType;
  refreshMs?: number;
  accent: AccentPreset;
  requiresAccount?: IntegrationProviderId[];
  frame?: WidgetFrame;
  useLock?: (instanceId: string) => WidgetLock | null;
  removalNote?: (instanceId: string) => string | null;
};
