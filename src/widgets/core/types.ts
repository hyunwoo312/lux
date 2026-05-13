import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { AccentPreset } from "@/widgets/core/accent";

export const WIDGET_TYPES = ["clock", "tasks", "quickAccess", "image"] as const;
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
  icon: LucideIcon;
  defaultLayout: { w: number; h: number; minW: number; minH: number; maxW: number; maxH: number };
  component: ComponentType<WidgetContentProps>;
  configComponent?: ComponentType;
  statusComponent?: ComponentType;
  headerActionComponent?: ComponentType;
  backdropComponent?: ComponentType;
  accent?: AccentPreset;
  bleed?: boolean;
  useBare?: () => boolean;
};
