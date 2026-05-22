import { CalendarDays, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useCalendarStore } from "@/widgets/calendar/useCalendarStore";

export function CalendarViewToggle() {
  const view = useCalendarStore((s) => s.view);
  const setView = useCalendarStore((s) => s.setView);
  const isCalendar = view === "calendar";

  return (
    <Tooltip content={isCalendar ? "List view" : "Calendar view"}>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground/60 hover:text-foreground size-7 rounded-sm [&_svg]:size-4"
        aria-label={isCalendar ? "Switch to list view" : "Switch to calendar view"}
        onClick={() => setView(isCalendar ? "list" : "calendar")}
      >
        {isCalendar ? <List /> : <CalendarDays />}
      </Button>
    </Tooltip>
  );
}
