import type { ComponentType } from "react";
import type { AccentPreset } from "@/widgets/core/accent";

export type WidgetIcon = ComponentType<{ className?: string }>;

export const WIDGET_TYPES = [
  "tasks",
  "quickAccess",
  "image",
  "calendar",
  "spotify",
] as const;
export type WidgetType = (typeof WIDGET_TYPES)[number];

export type WidgetInstance = {
  id: string;
  type: WidgetType;
};

export type WidgetContentProps = {
  editing: boolean;
};

export type WidgetPlugin = {
  type: WidgetType;
  name: string;
  icon: WidgetIcon;
  brandIcon?: boolean;
  defaultLayout: { w: number; h: number; minW: number; minH: number; maxW: number; maxH: number };
  component: ComponentType<WidgetContentProps>;
  configComponent?: ComponentType;
  statusComponent?: ComponentType;
  headerActionComponent?: ComponentType;
  backdropComponent?: ComponentType;
  decorativeBackdrop?: boolean;
  accent?: AccentPreset;
  bleed?: boolean;
  useBare?: () => boolean;
};
