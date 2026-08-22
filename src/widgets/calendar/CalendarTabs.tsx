import { CalendarDays, CalendarRange } from "lucide-react";
import { WidgetTabs, type WidgetTab } from "@/widgets/core/WidgetTabs";
import { useCalendar, useCalendarStore } from "@/widgets/calendar/useCalendarStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type { CalendarView } from "@/widgets/calendar/types";

const TABS: WidgetTab<CalendarView>[] = [
  { value: "agenda", label: "Agenda", icon: CalendarRange },
  { value: "calendar", label: "Calendar", icon: CalendarDays },
];

export function CalendarTabs() {
  const instanceId = useWidgetInstanceId();
  const view = useCalendar((d) => d.view);
  const setView = useCalendarStore((s) => s.setView);

  return <WidgetTabs tabs={TABS} value={view} onSelect={(next) => setView(instanceId, next)} />;
}
