import { CalendarDays } from "lucide-react";
import { useProviderLock } from "@/widgets/core/useProviderLock";
import type { WidgetPlugin } from "@/widgets/core/types";
import { CalendarWidget } from "@/widgets/calendar/CalendarWidget";
import { CalendarConfig } from "@/widgets/calendar/CalendarConfig";
import { CalendarHeaderActions } from "@/widgets/calendar/CalendarHeaderActions";
import { CalendarTabs } from "@/widgets/calendar/CalendarTabs";
import { CALENDAR_TINT } from "@/widgets/calendar/types";
import { useCalendarStore } from "@/widgets/calendar/useCalendarStore";

export const calendarPlugin: WidgetPlugin = {
  type: "calendar",
  name: "Calendar",
  category: "productivity",
  description: "Your upcoming schedule at a glance",
  icon: CalendarDays,
  defaultLayout: { w: 8, h: 9, minW: 6, minH: 6, maxW: 14, maxH: 14 },
  component: CalendarWidget,
  clearInstance: (instanceId) => useCalendarStore.getState().removeInstance(instanceId),
  configComponent: CalendarConfig,
  statusComponent: CalendarTabs,
  headerActionComponent: CalendarHeaderActions,
  tint: CALENDAR_TINT,
  requiresAccount: ["google", "microsoft"],
  useLock: () =>
    useProviderLock({
      providers: ["google", "microsoft"],
      label: "a calendar",
      subject: "your schedule",
    }),
  removalNote: () => "Its calendar selection will be reset — your accounts stay connected.",
};
