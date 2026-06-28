import { useEffect, useMemo, useRef, useState } from "react";
import type { Variants } from "motion/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useElementSize } from "@/hooks/useElementSize";
import { useNow } from "@/hooks/useNow";
import { DayPreview } from "@/widgets/calendar/components/DayPreview";
import {
  DAY_NUMBER_HEIGHT,
  EVENT_ROW_HEIGHT,
  MonthWeek,
} from "@/widgets/calendar/components/MonthWeek";
import { getEventsByDate } from "@/widgets/calendar/lib/agenda";
import {
  addDays,
  getDateKey,
  getMonthGridDays,
  startOfDay,
} from "@/widgets/calendar/lib/dates";
import { computeMonthLayout } from "@/widgets/calendar/lib/month-layout";
import { SLIDE_SPRING } from "@/widgets/calendar/lib/motion";
import { EASE_OUT_QUINT } from "@/lib/motion";
import { useCalendarStore } from "@/widgets/calendar/useCalendarStore";
import type { DisplayCalendarEvent } from "@/widgets/calendar/types";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;

type CalendarGridProps = {
  events: DisplayCalendarEvent[];
  colors: Map<string, string>;
};

export function CalendarGrid({ events, colors }: CalendarGridProps) {
  const reduced = useReducedMotion();
  const mode = useCalendarStore((s) => s.mode);
  const visibleMonth = useCalendarStore((s) => s.visibleMonth);
  const selectedDay = useCalendarStore((s) => s.selectedDay);
  const focusRowIndex = useCalendarStore((s) => s.focusRowIndex);
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);
  const hoverRectRef = useRef<DOMRect | null>(null);

  const now = useNow();
  const todayKey = getDateKey(now);

  const monthDays = useMemo(() => getMonthGridDays(visibleMonth), [visibleMonth]);
  const layout = useMemo(
    () => computeMonthLayout(monthDays, events, visibleMonth, todayKey),
    [monthDays, events, visibleMonth, todayKey],
  );
  const eventsByDate = useMemo(() => getEventsByDate(events), [events]);
  const [gridRef, { width, height }] = useElementSize<HTMLDivElement>();

  const visibleMonthIndex = visibleMonth.getFullYear() * 12 + visibleMonth.getMonth();
  const previousMonthIndex = useRef(visibleMonthIndex);
  const monthDirection = Math.sign(visibleMonthIndex - previousMonthIndex.current);
  useEffect(() => {
    previousMonthIndex.current = visibleMonthIndex;
  }, [visibleMonthIndex]);

  const weekStart = selectedDay ? addDays(startOfDay(selectedDay), -selectedDay.getDay()) : null;
  const weekTime = weekStart ? weekStart.getTime() : 0;
  const previousWeekTime = useRef(weekTime);
  const weekDirection = Math.sign(weekTime - previousWeekTime.current);
  useEffect(() => {
    previousWeekTime.current = weekTime;
  }, [weekTime]);

  const rowHeight = height / 6;
  const cellWidth = width / 7;
  const maxRows = Math.max(0, Math.floor((rowHeight - DAY_NUMBER_HEIGHT) / EVENT_ROW_HEIGHT));
  const dotsMode = maxRows < 1;
  const showTitles = cellWidth >= 64;
  const cellProps = { eventsByDate, colors, maxRows, dotsMode, showTitles, cellWidth };

  const selectedKey = selectedDay ? getDateKey(selectedDay) : null;
  const focusedWeek = useMemo(() => {
    if (mode !== "week" || !selectedDay || !selectedKey) return null;
    const inGrid = layout.weeks.find((week) => week.days.some((day) => day.dateKey === selectedKey));
    if (inGrid) return inGrid;
    const weekMonth = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1);
    const weekLayout = computeMonthLayout(getMonthGridDays(weekMonth), events, weekMonth, todayKey);
    return (
      weekLayout.weeks.find((week) => week.days.some((day) => day.dateKey === selectedKey)) ?? null
    );
  }, [mode, selectedDay, selectedKey, layout, events, todayKey]);
  const dayEvents = selectedKey ? (eventsByDate.get(selectedKey) ?? []) : [];

  const transition = { duration: reduced ? 0 : 0.5, ease: EASE_OUT_QUINT } as const;
  const verticalSlide: Variants = {
    enter: (dir: number) => ({ y: reduced ? "0%" : `${dir * 100}%`, opacity: reduced ? 0 : 1 }),
    center: { y: "0%", opacity: 1 },
    exit: (dir: number) => ({ y: reduced ? "0%" : `${-dir * 100}%`, opacity: reduced ? 0 : 1 }),
  };
  const horizontalSlide: Variants = {
    enter: (dir: number) => ({ x: reduced ? "0%" : `${dir * 100}%`, opacity: reduced ? 0 : 1 }),
    center: { x: "0%", opacity: 1 },
    exit: (dir: number) => ({ x: reduced ? "0%" : `${-dir * 100}%`, opacity: reduced ? 0 : 1 }),
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div aria-hidden className="text-muted-foreground/60 grid grid-cols-7 pb-1">
        {WEEKDAYS.map((weekday, index) => (
          <span key={index} className="text-2xs text-center font-semibold">
            {weekday}
          </span>
        ))}
      </div>
      <div
        ref={gridRef}
        role="grid"
        aria-label="Calendar"
        className="relative min-h-0 flex-1 overflow-hidden"
        onKeyDown={(event) => {
          const target = event.target as HTMLElement;
          if (!target.matches?.('[role="gridcell"]')) return;
          const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
          if (delta === undefined) return;
          event.preventDefault();
          const cells = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>('[role="gridcell"]'),
          ).filter((cell) => cell.clientHeight > 0);
          const next = cells[cells.indexOf(target) + delta];
          next?.focus();
        }}
        onMouseEnter={(event) => {
          hoverRectRef.current = event.currentTarget.getBoundingClientRect();
        }}
        onMouseMove={(event) => {
          if (rowHeight <= 0 || cellWidth <= 0) return;
          const rect = hoverRectRef.current ?? event.currentTarget.getBoundingClientRect();
          const col = Math.min(6, Math.max(0, Math.floor((event.clientX - rect.left) / cellWidth)));
          const localY = event.clientY - rect.top;
          if (mode === "week") {
            if (localY > rowHeight) {
              setHover((prev) => (prev ? null : prev));
              return;
            }
            setHover((prev) => (prev && prev.row === 0 && prev.col === col ? prev : { row: 0, col }));
          } else {
            const row = Math.min(5, Math.max(0, Math.floor(localY / rowHeight)));
            setHover((prev) => (prev && prev.row === row && prev.col === col ? prev : { row, col }));
          }
        }}
        onMouseLeave={() => setHover((prev) => (prev ? null : prev))}
      >
        <AnimatePresence>
          {hover && cellWidth > 0 && rowHeight > 0 && (
            <motion.div
              key="grid-hover"
              aria-hidden
              initial={{ opacity: 0, x: hover.col * cellWidth, y: hover.row * rowHeight }}
              animate={{ opacity: 1, x: hover.col * cellWidth, y: hover.row * rowHeight }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: reduced ? 0 : 0.15 },
                x: reduced ? { duration: 0 } : SLIDE_SPRING,
                y: reduced ? { duration: 0 } : SLIDE_SPRING,
              }}
              style={{
                width: Math.max(0, cellWidth - 4),
                height: Math.max(0, rowHeight - 4),
                left: 2,
                top: 2,
              }}
              className="bg-foreground/[0.06] pointer-events-none absolute rounded-md"
            />
          )}
        </AnimatePresence>
        <AnimatePresence mode="popLayout" initial={false} custom={monthDirection}>
          <motion.div
            key={visibleMonthIndex}
            custom={monthDirection}
            variants={verticalSlide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            className="absolute inset-0 flex flex-col"
          >
            {layout.weeks.map((week, index) => {
              const isFocusRow = mode === "week" && index === focusRowIndex;
              const collapsed = mode === "week" && !isFocusRow;
              return (
                <motion.div
                  key={index}
                  initial={false}
                  animate={{ height: collapsed ? 0 : rowHeight, opacity: collapsed ? 0 : 1 }}
                  transition={transition}
                  className="shrink-0 overflow-hidden"
                >
                  {isFocusRow ? (
                    <div className="relative h-full overflow-hidden">
                      <AnimatePresence mode="popLayout" initial={false} custom={weekDirection}>
                        <motion.div
                          key={weekTime}
                          custom={weekDirection}
                          variants={horizontalSlide}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          transition={transition}
                          className="absolute inset-0"
                        >
                          <MonthWeek week={focusedWeek ?? week} {...cellProps} />
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  ) : (
                    <MonthWeek week={week} {...cellProps} />
                  )}
                </motion.div>
              );
            })}
            <motion.div
              className="min-h-0 flex-1 overflow-hidden"
              initial={false}
              animate={{ opacity: mode === "week" ? 1 : 0 }}
              transition={transition}
            >
              {mode === "week" && (
                <div className="flex h-full min-h-0 flex-col gap-2 pt-2">
                  <div className="border-border/40 border-t" />
                  <div className="relative min-h-0 flex-1 overflow-hidden">
                    <AnimatePresence mode="popLayout" initial={false} custom={weekDirection}>
                      <motion.div
                        key={selectedKey}
                        custom={weekDirection}
                        variants={horizontalSlide}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={transition}
                        className="absolute inset-0"
                      >
                        <DayPreview
                        events={dayEvents}
                        colors={colors}
                        now={now}
                        reduced={reduced}
                      />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
