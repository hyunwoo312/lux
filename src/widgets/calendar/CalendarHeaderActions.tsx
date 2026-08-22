import { CalendarRefreshButton } from "@/widgets/calendar/CalendarRefreshButton";
import { CalendarVisibilityPicker } from "@/widgets/calendar/components/CalendarVisibilityPicker";

export function CalendarHeaderActions() {
  return (
    <div className="flex items-center gap-0.5">
      <CalendarVisibilityPicker />
      <CalendarRefreshButton />
    </div>
  );
}
