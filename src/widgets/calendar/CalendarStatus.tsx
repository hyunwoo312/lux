import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, CalendarRange } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { AnimatedHeaderText } from "@/widgets/calendar/components/AnimatedHeaderText";
import { CalendarRangePicker } from "@/widgets/calendar/components/CalendarRangePicker";
import { addDays } from "@/widgets/calendar/lib/dates";
import { useCalendar, useCalendarStore } from "@/widgets/calendar/useCalendarStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { MAX_LOOKAHEAD_DAYS } from "@/widgets/calendar/types";

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" });
const monthDayFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const dayFormatter = new Intl.DateTimeFormat(undefined, { day: "numeric" });

const DATE_LABEL = "font-display text-foreground text-base font-semibold";
const STATUS_BUTTON = `
  text-muted-foreground/60
  hover:text-foreground
  focus-visible:text-foreground
  flex size-6 flex-none items-center justify-center rounded-sm outline-none transition-colors
  hover:bg-foreground/[0.06]
  focus-visible:bg-foreground/[0.06]
  [&_svg]:size-4
`;

function formatRange(start: Date, end: Date): string {
  if (start.getMonth() === end.getMonth()) {
    return `${monthDayFormatter.format(start)} – ${dayFormatter.format(end)}`;
  }
  return `${monthDayFormatter.format(start)} – ${monthDayFormatter.format(end)}`;
}

export function CalendarStatus() {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const instanceId = useWidgetInstanceId();
  const view = useCalendar((d) => d.view);
  const mode = useCalendar((d) => d.mode);
  const visibleMonth = useCalendar((d) => d.visibleMonth);
  const selectedDay = useCalendar((d) => d.selectedDay);
  const listAnchor = useCalendar((d) => d.listAnchor);
  const lookaheadDays = useCalendar((d) => d.lookaheadDays);
  const exitWeek = useCalendarStore((s) => s.exitWeek);

  const isList = view === "list";
  const inWeek = !isList && mode === "week" && selectedDay !== null;

  let label: string;
  if (isList) {
    const end = addDays(listAnchor, Math.min(MAX_LOOKAHEAD_DAYS, Math.max(1, lookaheadDays)) - 1);
    label = formatRange(listAnchor, end);
  } else if (inWeek && selectedDay) {
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
            <PopoverTrigger aria-label="Change date range" className={STATUS_BUTTON}>
              <CalendarRange />
            </PopoverTrigger>
          </Tooltip>
          <PopoverContent align="start" className="w-auto p-0">
            <CalendarRangePicker onSelect={() => setOpen(false)} />
          </PopoverContent>
        </Popover>
      )}
      <AnimatePresence initial={false}>
        {inWeek && (
          <motion.span
            key="back-to-month"
            layout={reduced ? false : "position"}
            className="flex-none overflow-hidden"
            initial={reduced ? { opacity: 0 } : { opacity: 0, width: 0 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, width: "auto" }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, width: 0 }}
            transition={{ duration: reduced ? 0 : 0.18, ease: "easeOut" }}
          >
            <Tooltip content="Back to month">
              <button
                type="button"
                aria-label="Back to month"
                className={STATUS_BUTTON}
                onClick={() => exitWeek(instanceId)}
              >
                <ArrowLeft />
              </button>
            </Tooltip>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
