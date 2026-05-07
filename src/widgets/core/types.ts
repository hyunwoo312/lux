import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { AccentPreset } from "@/widgets/core/accent";

export const WIDGET_TYPES = ["clock", "tasks"] as const;
export type WidgetType = (typeof WIDGET_TYPES)[number];

export type WidgetInstance = {
  id: string;
  type: WidgetType;
};

export type WidgetPlugin = {
  type: WidgetType;
  name: string;
  icon: LucideIcon;
  defaultLayout: { w: number; h: number; minW: number; minH: number; maxW: number; maxH: number };
  component: ComponentType;
  configComponent?: ComponentType;
  statusComponent?: ComponentType;
  accent?: AccentPreset;
};
