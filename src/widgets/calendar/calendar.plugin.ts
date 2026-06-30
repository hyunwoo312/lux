import { CalendarDays } from "lucide-react";
import type { WidgetPlugin } from "@/widgets/core/types";
import { CalendarWidget } from "@/widgets/calendar/CalendarWidget";
import { CalendarConfig } from "@/widgets/calendar/CalendarConfig";
import { CalendarHeaderActions } from "@/widgets/calendar/CalendarHeaderActions";
import { CalendarStatus } from "@/widgets/calendar/CalendarStatus";

export const calendarPlugin: WidgetPlugin = {
  type: "calendar",
  name: "Calendar",
  icon: CalendarDays,
  defaultLayout: { w: 8, h: 9, minW: 6, minH: 6, maxW: 14, maxH: 14 },
  component: CalendarWidget,
  configComponent: CalendarConfig,
  statusComponent: CalendarStatus,
  headerActionComponent: CalendarHeaderActions,
  accent: "orange",};
