import { CalendarDays, List } from "lucide-react";
import { ViewToggleButton } from "@/widgets/core/ViewToggleButton";
import { useCalendar, useCalendarStore } from "@/widgets/calendar/useCalendarStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function CalendarViewToggle() {
  const instanceId = useWidgetInstanceId();
  const view = useCalendar((d) => d.view);
  const setView = useCalendarStore((s) => s.setView);
  const isCalendar = view === "calendar";

  return (
    <ViewToggleButton
      targetKey={isCalendar ? "list" : "calendar"}
      targetLabel={isCalendar ? "list view" : "calendar view"}
      icon={isCalendar ? List : CalendarDays}
      onToggle={() => setView(instanceId, isCalendar ? "list" : "calendar")}
    />
  );
}
