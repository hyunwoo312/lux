import { EASE_OUT } from "@/lib/motion";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AnimatedHeaderText } from "@/widgets/calendar/components/AnimatedHeaderText";
import { addDays, formatDayRange, startOfWeek } from "@/widgets/calendar/lib/dates";
import { useCalendar, useCalendarStore } from "@/widgets/calendar/useCalendarStore";
import { WIDGET_HEADER_ACTION } from "@/widgets/core/chromeStyles";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import type { WidgetIcon } from "@/widgets/core/types";

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" });

function NavButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: WidgetIcon;
  onClick: () => void;
}) {
  return (
    <Tooltip content={label}>
      <Button
        variant="ghost"
        size="icon-xs"
        className={cn(WIDGET_HEADER_ACTION, "size-6 [&_svg]:size-3.5")}
        aria-label={label}
        onClick={onClick}
      >
        <Icon />
      </Button>
    </Tooltip>
  );
}

export function MonthControls() {
  const reduced = useReducedMotion();
  const instanceId = useWidgetInstanceId();
  const mode = useCalendar((d) => d.mode);
  const visibleMonth = useCalendar((d) => d.visibleMonth);
  const selectedDay = useCalendar((d) => d.selectedDay);
  const shiftMonth = useCalendarStore((s) => s.shiftMonth);
  const shiftWeek = useCalendarStore((s) => s.shiftWeek);
  const goToToday = useCalendarStore((s) => s.goToToday);
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
            <NavButton
              label="Back to month"
              icon={ArrowLeft}
              onClick={() => exitWeek(instanceId)}
            />
          </motion.span>
        )}
      </AnimatePresence>
      <NavButton
        label={inWeek ? "Previous week" : "Previous month"}
        icon={ChevronLeft}
        onClick={() => shift(-1)}
      />
      <NavButton
        label={inWeek ? "Next week" : "Next month"}
        icon={ChevronRight}
        onClick={() => shift(1)}
      />
      <NavButton label="Go to today" icon={CalendarClock} onClick={() => goToToday(instanceId)} />
    </div>
  );
}
