import { Clock } from "lucide-react";
import type { WidgetPlugin } from "@/widgets/core/types";
import { ClockWidget } from "@/widgets/clock/ClockWidget";

export const clockPlugin: WidgetPlugin = {
  type: "clock",
  name: "Clock",
  icon: Clock,
  defaultLayout: { w: 3, h: 3, minW: 2, minH: 2, maxW: 6, maxH: 6 },
  component: ClockWidget,
};
