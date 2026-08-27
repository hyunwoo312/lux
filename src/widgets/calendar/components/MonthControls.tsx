import { EASE_OUT } from "@/lib/motion";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatedHeaderText } from "@/widgets/calendar/components/AnimatedHeaderText";
import { CalendarNavButton, TodayButton } from "@/widgets/calendar/components/CalendarNavButton";
import { addDays, formatDayRange, startOfWeek } from "@/widgets/calendar/lib/dates";
import { useCalendar, useCalendarStore } from "@/widgets/calendar/useCalendarStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" });

export function MonthControls() {
  const reduced = useReducedMotion();
  const instanceId = useWidgetInstanceId();
  const mode = useCalendar((d) => d.mode);
  const visibleMonth = useCalendar((d) => d.visibleMonth);
  const selectedDay = useCalendar((d) => d.selectedDay);
  const shiftMonth = useCalendarStore((s) => s.shiftMonth);
  const shiftWeek = useCalendarStore((s) => s.shiftWeek);
  const exitWeek = useCalendarStore((s) => s.exitWeek);

  const inWeek = mode === "week" && selectedDay !== null;
  const weekStart = selectedDay ? startOfWeek(selectedDay) : null;
  const label =
    inWeek && weekStart
      ? formatDayRange(weekStart, addDays(weekStart, 6))
      : monthFormatter.format(visibleMonth);

  const shift = (offset: number) =>
    inWeek ? shiftWeek(instanceId, offset) : shiftMonth(instanceId, offset);

  return (
    <div className="flex items-center gap-0.5 pb-0.5">
      <span className="min-w-0 flex-1">
        <AnimatedHeaderText className="text-ink text-body font-semibold" text={label} />
      </span>
      <AnimatePresence initial={false}>
        {inWeek && (
          <motion.span
            key="back-to-month"
            className="flex-none overflow-hidden"
            initial={reduced ? { opacity: 0 } : { opacity: 0, width: 0 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, width: "auto" }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, width: 0 }}
            transition={{ duration: reduced ? 0 : 0.18, ease: EASE_OUT }}
          >
            <CalendarNavButton
              label="Back to month"
              icon={ArrowLeft}
              onClick={() => exitWeek(instanceId)}
            />
          </motion.span>
        )}
      </AnimatePresence>
      <CalendarNavButton
        label={inWeek ? "Previous week" : "Previous month"}
        icon={ChevronLeft}
        onClick={() => shift(-1)}
      />
      <CalendarNavButton
        label={inWeek ? "Next week" : "Next month"}
        icon={ChevronRight}
        onClick={() => shift(1)}
      />
      <TodayButton />
    </div>
  );
}
