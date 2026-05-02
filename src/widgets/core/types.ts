import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

export type WidgetType = "clock";

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
};
