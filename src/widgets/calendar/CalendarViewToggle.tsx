import { CalendarDays, List } from "lucide-react";
import { ViewToggleButton } from "@/widgets/core/ViewToggleButton";
import { useCalendarStore } from "@/widgets/calendar/useCalendarStore";

export function CalendarViewToggle() {
  const view = useCalendarStore((s) => s.view);
  const setView = useCalendarStore((s) => s.setView);
  const isCalendar = view === "calendar";

  return (
    <ViewToggleButton
      targetKey={isCalendar ? "list" : "calendar"}
      targetLabel={isCalendar ? "list view" : "calendar view"}
      icon={isCalendar ? List : CalendarDays}
      onToggle={() => setView(isCalendar ? "list" : "calendar")}
    />
  );
}
