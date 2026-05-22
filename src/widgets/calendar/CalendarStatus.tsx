import { useState } from "react";
import { CalendarRange } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { AnimatedHeaderText } from "@/widgets/calendar/components/AnimatedHeaderText";
import { CalendarRangePicker } from "@/widgets/calendar/components/CalendarRangePicker";
import { addDays } from "@/widgets/calendar/lib/dates";
import { useCalendarStore } from "@/widgets/calendar/useCalendarStore";
import { MAX_LOOKAHEAD_DAYS } from "@/widgets/calendar/types";

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" });
const monthDayFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const dayFormatter = new Intl.DateTimeFormat(undefined, { day: "numeric" });

const DATE_LABEL = "font-display text-foreground text-base font-semibold";

function formatRange(start: Date, end: Date): string {
  if (start.getMonth() === end.getMonth()) {
    return `${monthDayFormatter.format(start)} – ${dayFormatter.format(end)}`;
  }
  return `${monthDayFormatter.format(start)} – ${monthDayFormatter.format(end)}`;
}

export function CalendarStatus() {
  const [open, setOpen] = useState(false);
  const view = useCalendarStore((s) => s.view);
  const mode = useCalendarStore((s) => s.mode);
  const visibleMonth = useCalendarStore((s) => s.visibleMonth);
  const selectedDay = useCalendarStore((s) => s.selectedDay);
  const listAnchor = useCalendarStore((s) => s.listAnchor);
  const lookaheadDays = useCalendarStore((s) => s.lookaheadDays);

  const isList = view === "list";

  let label: string;
  if (isList) {
    const end = addDays(listAnchor, Math.min(MAX_LOOKAHEAD_DAYS, Math.max(1, lookaheadDays)) - 1);
    label = formatRange(listAnchor, end);
  } else if (mode === "week" && selectedDay) {
    const weekStart = addDays(selectedDay, -selectedDay.getDay());
    label = formatRange(weekStart, addDays(weekStart, 6));
  } else {
    label = monthFormatter.format(visibleMonth);
  }

  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <AnimatedHeaderText className={DATE_LABEL} text={label} />
      {isList && (
        <Popover open={open} onOpenChange={setOpen}>
          <Tooltip content="Change date range">
            <PopoverTrigger
              aria-label="Change date range"
              className="
                text-muted-foreground/60
                hover:text-foreground
                focus-visible:text-foreground
                flex size-6 flex-none items-center justify-center rounded-sm outline-none
                transition-colors
                hover:bg-foreground/[0.06]
                focus-visible:bg-foreground/[0.06]
                [&_svg]:size-4
              "
            >
              <CalendarRange />
            </PopoverTrigger>
          </Tooltip>
          <PopoverContent align="start" className="w-auto p-0">
            <CalendarRangePicker onSelect={() => setOpen(false)} />
          </PopoverContent>
        </Popover>
      )}
    </span>
  );
}
