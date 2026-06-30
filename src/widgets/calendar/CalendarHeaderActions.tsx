import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { CalendarViewToggle } from "@/widgets/calendar/CalendarViewToggle";
import { useCalendar, useCalendarStore } from "@/widgets/calendar/useCalendarStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

const NAV_BUTTON = "text-muted-foreground/60 hover:text-foreground size-6 rounded-sm [&_svg]:size-3.5";

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip content={label}>
      <Button variant="ghost" size="icon" className={NAV_BUTTON} aria-label={label} onClick={onClick}>
        {children}
      </Button>
    </Tooltip>
  );
}

function CollapsingNavButton({
  reduced,
  label,
  onClick,
  children,
}: {
  reduced: boolean | null;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <motion.div
      className="shrink-0 overflow-hidden"
      initial={reduced ? { opacity: 0 } : { opacity: 0, width: 0 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, width: "auto" }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, width: 0 }}
      transition={{ duration: reduced ? 0 : 0.18, ease: "easeOut" }}
    >
      <NavButton label={label} onClick={onClick}>
        {children}
      </NavButton>
    </motion.div>
  );
}

export function CalendarHeaderActions() {
  const reduced = useReducedMotion();
  const instanceId = useWidgetInstanceId();
  const view = useCalendar((d) => d.view);
  const mode = useCalendar((d) => d.mode);
  const selectedDay = useCalendar((d) => d.selectedDay);
  const shiftMonth = useCalendarStore((s) => s.shiftMonth);
  const shiftWeek = useCalendarStore((s) => s.shiftWeek);
  const exitWeek = useCalendarStore((s) => s.exitWeek);
  const goToToday = useCalendarStore((s) => s.goToToday);

  const inWeek = view === "calendar" && mode === "week" && selectedDay !== null;
  const inMonth = view === "calendar" && mode === "month";

  return (
    <div className="flex items-center gap-0.5">
      <AnimatePresence initial={false}>
        {inWeek && (
          <CollapsingNavButton
            key="back"
            reduced={reduced}
            label="Back to month"
            onClick={() => exitWeek(instanceId)}
          >
            <ArrowLeft />
          </CollapsingNavButton>
        )}
        {inWeek && (
          <CollapsingNavButton
            key="prev-week"
            reduced={reduced}
            label="Previous week"
            onClick={() => shiftWeek(instanceId, -1)}
          >
            <ChevronLeft />
          </CollapsingNavButton>
        )}
        {inWeek && (
          <CollapsingNavButton
            key="next-week"
            reduced={reduced}
            label="Next week"
            onClick={() => shiftWeek(instanceId, 1)}
          >
            <ChevronRight />
          </CollapsingNavButton>
        )}
        {inMonth && (
          <CollapsingNavButton
            key="prev-month"
            reduced={reduced}
            label="Previous month"
            onClick={() => shiftMonth(instanceId, -1)}
          >
            <ChevronUp />
          </CollapsingNavButton>
        )}
        {inMonth && (
          <CollapsingNavButton
            key="next-month"
            reduced={reduced}
            label="Next month"
            onClick={() => shiftMonth(instanceId, 1)}
          >
            <ChevronDown />
          </CollapsingNavButton>
        )}
      </AnimatePresence>
      <NavButton label="Go to today" onClick={() => goToToday(instanceId)}>
        <CalendarClock />
      </NavButton>
      <span className="bg-border/50 mx-0.5 h-4 w-px shrink-0" aria-hidden />
      <CalendarViewToggle />
    </div>
  );
}
